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

    const now = new Date().toISOString();

    // Find paid challenges past start_date with min_participants not met
    const { data: challenges, error: fetchError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('is_paid', true)
      .gt('min_participants', 0)
      .in('prize_status', ['collecting', 'none'])
      .lte('start_date', now);

    if (fetchError) throw fetchError;
    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No challenges to refund', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let processed = 0;

    for (const challenge of challenges) {
      // Count paid participants
      const { count } = await supabaseAdmin
        .from('challenge_participants')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id)
        .eq('payment_status', 'paid');

      if ((count ?? 0) >= challenge.min_participants) continue;

      // Min not met — refund all paid participants
      await supabaseAdmin
        .from('challenges')
        .update({ prize_status: 'refunding' })
        .eq('id', challenge.id);

      const { data: participants } = await supabaseAdmin
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('payment_status', 'paid');

      if (!participants) continue;

      let allRefunded = true;

      for (const participant of participants) {
        try {
          if (!participant.payment_intent_id) continue;

          // Refund via Stripe
          const refund = await stripe.refunds.create({
            payment_intent: participant.payment_intent_id,
          });

          // Update participant status
          await supabaseAdmin
            .from('challenge_participants')
            .update({
              payment_status: 'refunded',
              refund_id: refund.id,
            })
            .eq('id', participant.id);

          // Notify user
          await supabaseAdmin.from('notifications').insert({
            user_id: participant.user_id,
            type: 'announcement',
            title: 'Challenge Cancelled — Refund Issued',
            body: `"${challenge.name}" didn't meet the minimum ${challenge.min_participants} participants. Your $${(participant.paid_amount_cents / 100).toFixed(2)} entry fee has been refunded.`,
            data: { challenge_id: challenge.id },
          });
        } catch (err) {
          console.error(`Error refunding participant ${participant.id}:`, err);
          allRefunded = false;
        }
      }

      // Update challenge status
      await supabaseAdmin
        .from('challenges')
        .update({
          prize_status: allRefunded ? 'refunded' : 'refunding',
          prize_pool_cents: 0,
        })
        .eq('id', challenge.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ message: 'Refund processing complete', processed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
