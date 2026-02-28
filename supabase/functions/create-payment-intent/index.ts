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

    // Use service role for reads that need full access
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

    if (!challenge.is_paid || challenge.entry_fee_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'This is not a paid challenge' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check challenge hasn't started (no late joins for paid)
    if (new Date(challenge.start_date) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Challenge has already started. Late joins are not allowed for paid challenges.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check for existing participant record
    const { data: existing } = await supabaseAdmin
      .from('challenge_participants')
      .select('id, payment_status, payment_intent_id')
      .eq('challenge_id', challenge_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ error: 'You have already joined this challenge' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Stale pending record — cancel old PI and delete row so we can create a fresh one
      if (existing.payment_status === 'pending' && existing.payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(existing.payment_intent_id);
        } catch {
          // Old PI may already be cancelled — safe to ignore
        }
      }

      // Delete stale row (pending or refunded) to allow re-creation
      await supabaseAdmin
        .from('challenge_participants')
        .delete()
        .eq('id', existing.id);
    }

    // Create PaymentIntent — amount determined server-side (security)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: challenge.entry_fee_cents,
      currency: 'usd',
      metadata: {
        challenge_id: challenge.id,
        user_id: user.id,
        challenge_name: challenge.name,
      },
      transfer_group: `challenge_${challenge.id}`,
    });

    // Record pending participant with payment info
    const { error: insertError } = await supabaseAdmin
      .from('challenge_participants')
      .insert({
        challenge_id: challenge.id,
        user_id: user.id,
        total_steps: 0,
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        paid_amount_cents: challenge.entry_fee_cents,
      });

    if (insertError) {
      // Cancel the PI if we can't record the participant
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: challenge.entry_fee_cents,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
