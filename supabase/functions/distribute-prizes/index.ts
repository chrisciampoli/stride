import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const PLATFORM_FEE_PCT = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check - verify request comes from authorized source
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('x-cron-secret');
  const authorizationHeader = req.headers.get('Authorization');

  // Allow service role key OR cron secret
  const isServiceRole = authorizationHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const isCronSecret = cronSecret && authHeader === cronSecret;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find paid challenges that are completed/tiebreaker-ended and need distribution
    const now = new Date().toISOString();

    const { data: challenges, error: fetchError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('is_paid', true)
      .in('prize_status', ['funded', 'collecting'])
      .or(`and(status.eq.completed,tiebreaker_end_date.is.null),and(status.eq.tiebreaker,tiebreaker_end_date.lte.${now})`);

    if (fetchError) throw fetchError;
    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No challenges to distribute', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let processed = 0;

    for (const challenge of challenges) {
      try {
        // Mark as distributing
        await supabaseAdmin
          .from('challenges')
          .update({ prize_status: 'distributing' })
          .eq('id', challenge.id);

        // Get paid participants ranked by total_steps DESC, joined_at ASC (tiebreaker)
        const { data: participants } = await supabaseAdmin
          .from('challenge_participants')
          .select('*')
          .eq('challenge_id', challenge.id)
          .eq('payment_status', 'paid')
          .order('total_steps', { ascending: false })
          .order('joined_at', { ascending: true });

        if (!participants || participants.length === 0) continue;

        // Check for ties at top positions
        const payoutStructure: Array<{ place: number; pct: number }> = challenge.payout_structure || [];
        const maxPayoutPlace = Math.max(...payoutStructure.map((p: { place: number }) => p.place), 0);

        // Detect ties among prize positions
        if (challenge.status !== 'tiebreaker' && !challenge.tiebreaker_end_date) {
          const prizePositions = participants.slice(0, maxPayoutPlace);
          let hasTie = false;

          for (let i = 0; i < prizePositions.length - 1; i++) {
            if (prizePositions[i].total_steps === prizePositions[i + 1].total_steps) {
              hasTie = true;
              break;
            }
          }

          if (hasTie) {
            // Set tiebreaker: extend by 1 day
            const tiebreakerEnd = new Date(challenge.end_date);
            tiebreakerEnd.setDate(tiebreakerEnd.getDate() + 1);

            await supabaseAdmin
              .from('challenges')
              .update({
                status: 'tiebreaker',
                tiebreaker_end_date: tiebreakerEnd.toISOString(),
                prize_status: challenge.prize_status, // revert from distributing
              })
              .eq('id', challenge.id);

            // Notify participants
            for (const p of participants) {
              await supabaseAdmin.from('notifications').insert({
                user_id: p.user_id,
                type: 'announcement',
                title: "It's a Tie!",
                body: `"${challenge.name}" is tied! 1 extra day has been added to break it.`,
                data: { challenge_id: challenge.id },
              });
            }

            continue; // Skip distribution, wait for tiebreaker to end
          }
        }

        // Calculate distributable amount (prize pool minus platform fee)
        const platformFee = Math.floor(challenge.prize_pool_cents * PLATFORM_FEE_PCT / 100);
        const distributable = challenge.prize_pool_cents - platformFee;

        // Distribute prizes
        for (const tier of payoutStructure) {
          const winner = participants[tier.place - 1];
          if (!winner) continue;

          const amount = Math.floor(distributable * tier.pct / 100);
          if (amount <= 0) continue;

          const idempotencyKey = `prize_${challenge.id}_place_${tier.place}`;

          // Credit winner's wallet
          await supabaseAdmin.rpc('credit_wallet', {
            p_user_id: winner.user_id,
            p_amount: amount,
            p_type: 'prize_won',
            p_description: `${ordinal(tier.place)} place in "${challenge.name}"`,
            p_reference_id: challenge.id,
            p_idempotency_key: idempotencyKey,
          });

          // Record prize distribution
          await supabaseAdmin.from('prize_distributions').insert({
            challenge_id: challenge.id,
            user_id: winner.user_id,
            place: tier.place,
            amount_cents: amount,
            status: 'completed',
          });

          // Notify winner
          const amountDollars = (amount / 100).toFixed(2);
          await supabaseAdmin.from('notifications').insert({
            user_id: winner.user_id,
            type: 'announcement',
            title: `You Won $${amountDollars}!`,
            body: `Your steps in "${challenge.name}" earned you the ${ordinal(tier.place)} place prize!`,
            data: { challenge_id: challenge.id, amount_cents: amount, place: tier.place },
          });
        }

        // Mark as distributed
        await supabaseAdmin
          .from('challenges')
          .update({ prize_status: 'distributed' })
          .eq('id', challenge.id);

        processed++;
      } catch (err) {
        console.error(`Error distributing challenge ${challenge.id}:`, err);
        // Revert to previous status on error
        await supabaseAdmin
          .from('challenges')
          .update({ prize_status: 'funded' })
          .eq('id', challenge.id);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Distribution complete', processed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
