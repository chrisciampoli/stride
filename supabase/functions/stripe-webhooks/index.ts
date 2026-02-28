import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Deduplicate events
    const { error: dedupError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
      });

    if (dedupError) {
      // Already processed this event
      return new Response(JSON.stringify({ received: true, deduplicated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const challengeId = pi.metadata.challenge_id;
        const userId = pi.metadata.user_id;

        if (!challengeId || !userId) break;

        // Update participant payment status
        await supabaseAdmin
          .from('challenge_participants')
          .update({ payment_status: 'paid' })
          .eq('payment_intent_id', pi.id);

        // Atomically increment prize pool (prevents race condition with concurrent webhooks)
        await supabaseAdmin.rpc('increment_prize_pool', {
          p_challenge_id: challengeId,
          p_amount: pi.amount,
        });

        // Send confirmation notification
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'announcement',
          title: 'Payment Confirmed',
          body: `You're in! Your entry fee for "${pi.metadata.challenge_name}" has been confirmed.`,
          data: { challenge_id: challengeId },
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata.user_id;
        const challengeId = pi.metadata.challenge_id;

        if (!challengeId || !userId) break;

        // Remove the pending participant
        await supabaseAdmin
          .from('challenge_participants')
          .delete()
          .eq('payment_intent_id', pi.id)
          .eq('payment_status', 'pending');

        // Notify the user
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'announcement',
          title: 'Payment Failed',
          body: `Your payment for "${pi.metadata.challenge_name}" didn't go through. Please try again.`,
          data: { challenge_id: challengeId },
        });

        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        await supabaseAdmin
          .from('stripe_connect_accounts')
          .update({
            payouts_enabled: account.payouts_enabled ?? false,
            onboarding_complete: account.details_submitted ?? false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id);

        break;
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Clean up any orphaned pending participant
        await supabaseAdmin
          .from('challenge_participants')
          .delete()
          .eq('payment_intent_id', pi.id)
          .eq('payment_status', 'pending');

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (!piId) break;

        // Update participant payment status
        await supabaseAdmin
          .from('challenge_participants')
          .update({
            payment_status: 'refunded',
            refund_id: charge.refunds?.data?.[0]?.id ?? null,
          })
          .eq('payment_intent_id', piId);

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
