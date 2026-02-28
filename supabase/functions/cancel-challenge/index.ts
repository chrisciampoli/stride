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
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { challenge_id } = await req.json();
    if (!challenge_id) {
      return new Response(
        JSON.stringify({ error: 'challenge_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch challenge
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challenge) {
      return new Response(
        JSON.stringify({ error: 'Challenge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Only the creator can cancel
    if (challenge.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only the challenge creator can cancel' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Block if prizes already distributed
    if (challenge.prize_status === 'distributed' || challenge.prize_status === 'distributing') {
      return new Response(
        JSON.stringify({ error: 'Cannot cancel — prizes have already been distributed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Mark as refunding
    await supabaseAdmin
      .from('challenges')
      .update({ prize_status: 'refunding' })
      .eq('id', challenge_id);

    // Cancel any pending PaymentIntents and delete those rows
    const { data: pendingParticipants } = await supabaseAdmin
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challenge_id)
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

    // Refund all paid participants
    const { data: paidParticipants } = await supabaseAdmin
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challenge_id)
      .eq('payment_status', 'paid');

    let allRefunded = true;
    const failedRefunds: string[] = [];

    for (const participant of paidParticipants ?? []) {
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
      } catch (err) {
        console.error(`Error refunding participant ${participant.id}:`, err);
        allRefunded = false;
        failedRefunds.push(participant.id);
      }
    }

    // Notify ALL participants (paid + pending that were cleaned up)
    const allParticipantUserIds = [
      ...(paidParticipants ?? []).map((p) => p.user_id),
      ...(pendingParticipants ?? []).map((p) => p.user_id),
    ];

    // Deduplicate and include creator
    const notifyUserIds = [...new Set([...allParticipantUserIds, challenge.created_by])];

    const entryFeeFormatted = `$${(challenge.entry_fee_cents / 100).toFixed(2)}`;

    for (const userId of notifyUserIds) {
      const isPaidParticipant = (paidParticipants ?? []).some((p) => p.user_id === userId);
      const body = isPaidParticipant
        ? `"${challenge.name}" has been cancelled by the organizer. Your ${entryFeeFormatted} entry fee will be refunded within 5-10 business days.`
        : `"${challenge.name}" has been cancelled by the organizer.`;

      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'announcement',
        title: 'Challenge Cancelled',
        body,
        data: { challenge_id },
      });
    }

    // Update challenge status
    if (allRefunded) {
      await supabaseAdmin
        .from('challenges')
        .update({
          status: 'cancelled',
          prize_status: 'refunded',
          prize_pool_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challenge_id);
    } else {
      // Some refunds failed — keep refunding status so it can be retried
      await supabaseAdmin
        .from('challenges')
        .update({
          prize_status: 'refunding',
          updated_at: new Date().toISOString(),
        })
        .eq('id', challenge_id);

      return new Response(
        JSON.stringify({
          error: 'Some refunds failed',
          failedRefunds,
          message: 'Challenge marked as refunding. Failed refunds need manual intervention.',
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, refundedCount: (paidParticipants ?? []).length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
