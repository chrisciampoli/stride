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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check if user already has a Connect account
    const { data: existingAccount } = await supabaseAdmin
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let stripeAccountId: string;

    if (existingAccount) {
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      // Fetch user profile for prefill
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Create Express Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: profile?.full_name?.split(' ')[0] ?? undefined,
          last_name: profile?.full_name?.split(' ').slice(1).join(' ') ?? undefined,
          email: user.email,
        },
        metadata: {
          user_id: user.id,
        },
      });

      stripeAccountId = account.id;

      // Save to database
      await supabaseAdmin.from('stripe_connect_accounts').insert({
        user_id: user.id,
        stripe_account_id: account.id,
        payouts_enabled: false,
        onboarding_complete: false,
      });
    }

    // Create Account Link for onboarding
    const { return_url } = await req.json().catch(() => ({ return_url: undefined }));

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: return_url || 'strideapp://settings/wallet?refresh=true',
      return_url: return_url || 'strideapp://settings/wallet?success=true',
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        stripeAccountId,
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
