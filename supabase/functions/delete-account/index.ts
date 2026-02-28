import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Client to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Handle paid challenges before deletion ──────────────────────────
    // Find all active/upcoming paid challenges where this user has paid
    const { data: paidParticipations } = await supabaseAdmin
      .from('challenge_participants')
      .select('id, challenge_id, payment_intent_id, payment_status, paid_amount_cents, user_id')
      .eq('user_id', userId)
      .eq('payment_status', 'paid');

    if (paidParticipations && paidParticipations.length > 0) {
      // Get the associated challenges that are still active/upcoming and paid
      const challengeIds = [...new Set(paidParticipations.map((p) => p.challenge_id))];
      const { data: paidChallenges } = await supabaseAdmin
        .from('challenges')
        .select('*')
        .in('id', challengeIds)
        .eq('is_paid', true)
        .in('status', ['upcoming', 'active']);

      for (const challenge of paidChallenges ?? []) {
        const isCreator = challenge.created_by === userId;

        if (isCreator) {
          // Creator is deleting their account — refund ALL paid participants and cancel challenge
          try {
            // Block if prizes already distributed
            if (challenge.prize_status === 'distributed' || challenge.prize_status === 'distributing') {
              console.error(
                `Skipping refund for challenge ${challenge.id}: prizes already distributed/distributing`,
              );
              continue;
            }

            // Mark challenge as refunding
            await supabaseAdmin
              .from('challenges')
              .update({ prize_status: 'refunding' })
              .eq('id', challenge.id);

            // Cancel any pending PaymentIntents and remove those participant rows
            const { data: pendingParticipants } = await supabaseAdmin
              .from('challenge_participants')
              .select('*')
              .eq('challenge_id', challenge.id)
              .eq('payment_status', 'pending');

            for (const p of pendingParticipants ?? []) {
              try {
                if (p.payment_intent_id) {
                  await stripe.paymentIntents.cancel(p.payment_intent_id);
                }
              } catch {
                // PI may already be cancelled — safe to ignore
              }
              await supabaseAdmin
                .from('challenge_participants')
                .delete()
                .eq('id', p.id);
            }

            // Refund all paid participants (including the creator themselves)
            const { data: allPaidParticipants } = await supabaseAdmin
              .from('challenge_participants')
              .select('*')
              .eq('challenge_id', challenge.id)
              .eq('payment_status', 'paid');

            let allRefunded = true;

            for (const participant of allPaidParticipants ?? []) {
              try {
                if (!participant.payment_intent_id) continue;

                const refund = await stripe.refunds.create({
                  payment_intent: participant.payment_intent_id,
                });

                await supabaseAdmin
                  .from('challenge_participants')
                  .update({
                    payment_status: 'refunded',
                    refund_id: refund.id,
                  })
                  .eq('id', participant.id);

                // Notify non-deleting participants about the cancellation
                if (participant.user_id !== userId) {
                  const entryFeeFormatted = `$${(participant.paid_amount_cents / 100).toFixed(2)}`;
                  await supabaseAdmin.from('notifications').insert({
                    user_id: participant.user_id,
                    type: 'announcement',
                    title: 'Challenge Cancelled — Refund Issued',
                    body: `"${challenge.name}" has been cancelled because the organizer deleted their account. Your ${entryFeeFormatted} entry fee will be refunded within 5-10 business days.`,
                    data: { challenge_id: challenge.id },
                  });
                }
              } catch (err) {
                console.error(
                  `Error refunding participant ${participant.id} for challenge ${challenge.id}:`,
                  err,
                );
                allRefunded = false;
              }
            }

            // Update challenge status
            await supabaseAdmin
              .from('challenges')
              .update({
                status: 'cancelled',
                prize_status: allRefunded ? 'refunded' : 'refunding',
                prize_pool_cents: allRefunded ? 0 : challenge.prize_pool_cents,
                created_by: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', challenge.id);
          } catch (err) {
            console.error(
              `Error handling creator deletion for challenge ${challenge.id}:`,
              err,
            );
            // Don't block account deletion — log and continue
          }
        } else {
          // Participant (not creator) is deleting — refund just their payment
          const participation = paidParticipations.find(
            (p) => p.challenge_id === challenge.id,
          );

          if (!participation?.payment_intent_id) continue;

          try {
            const refund = await stripe.refunds.create({
              payment_intent: participation.payment_intent_id,
            });

            await supabaseAdmin
              .from('challenge_participants')
              .update({
                payment_status: 'refunded',
                refund_id: refund.id,
              })
              .eq('id', participation.id);

            // Reduce the challenge prize pool by this participant's contribution
            const newPrizePool = Math.max(
              0,
              challenge.prize_pool_cents - participation.paid_amount_cents,
            );
            await supabaseAdmin
              .from('challenges')
              .update({
                prize_pool_cents: newPrizePool,
                updated_at: new Date().toISOString(),
              })
              .eq('id', challenge.id);
          } catch (err) {
            console.error(
              `Error refunding participant ${participation.id} for challenge ${challenge.id}:`,
              err,
            );
            // Don't block account deletion — log and continue
          }
        }
      }
    }

    // ── End paid challenge handling ─────────────────────────────────────

    // Cascade delete in FK-safe order
    await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_badges').delete().eq('user_id', userId);
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await supabaseAdmin.from('daily_steps').delete().eq('user_id', userId);
    await supabaseAdmin.from('prize_distributions').delete().eq('user_id', userId);
    await supabaseAdmin.from('challenge_participants').delete().eq('user_id', userId);
    await supabaseAdmin.from('wallet_transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('wallets').delete().eq('user_id', userId);
    await supabaseAdmin.from('stripe_connect_accounts').delete().eq('user_id', userId);
    await supabaseAdmin.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    await supabaseAdmin.from('user_settings').delete().eq('user_id', userId);

    // Delete avatar from storage
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from('avatars').remove(filePaths);
    }

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
