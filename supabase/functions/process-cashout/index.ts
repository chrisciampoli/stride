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

    const { amount_cents } = await req.json();

    if (!amount_cents || amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user has a Connect account with payouts enabled
    const { data: connectAccount } = await supabaseAdmin
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('payouts_enabled', true)
      .maybeSingle();

    if (!connectAccount) {
      return new Response(
        JSON.stringify({ error: 'Stripe Connect account not set up or payouts not enabled. Complete onboarding first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const idempotencyKey = `cashout_${user.id}_${Date.now()}`;

    // Atomically debit wallet (will throw if insufficient balance)
    const { error: debitError } = await supabaseAdmin.rpc('debit_wallet', {
      p_user_id: user.id,
      p_amount: amount_cents,
      p_type: 'cashout',
      p_description: `Cash out $${(amount_cents / 100).toFixed(2)} to bank`,
      p_reference_id: connectAccount.stripe_account_id,
      p_idempotency_key: idempotencyKey,
    });

    if (debitError) {
      return new Response(
        JSON.stringify({ error: debitError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create Stripe Transfer to the user's Connect account
    try {
      const transfer = await stripe.transfers.create({
        amount: amount_cents,
        currency: 'usd',
        destination: connectAccount.stripe_account_id,
        metadata: {
          user_id: user.id,
          type: 'cashout',
          idempotency_key: idempotencyKey,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          transfer_id: transfer.id,
          amount_cents,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (stripeError) {
      // Reverse the wallet debit if Stripe transfer fails
      await supabaseAdmin.rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount: amount_cents,
        p_type: 'cashout_reversal',
        p_description: 'Cashout failed — funds returned',
        p_reference_id: idempotencyKey,
        p_idempotency_key: `reversal_${idempotencyKey}`,
      });

      return new Response(
        JSON.stringify({ error: `Transfer failed: ${(stripeError as Error).message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
