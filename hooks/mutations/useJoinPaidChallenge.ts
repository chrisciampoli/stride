import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';

interface JoinPaidChallengeInput {
  challengeId: string;
  challengeName: string;
}

export function useJoinPaidChallenge() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, challengeName }: JoinPaidChallengeInput) => {
      // Step 1: Create PaymentIntent via edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ challenge_id: challengeId }),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Step 2: Initialize PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: result.clientSecret,
        merchantDisplayName: 'Allen Footrace',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Step 3: Present PaymentSheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled or payment failed — the webhook will handle cleanup
        throw new Error(presentError.code === 'Canceled' ? 'Payment cancelled' : presentError.message);
      }

      // Payment succeeded — webhook will confirm and update participant status
      return { challengeId, paymentIntentId: result.paymentIntentId };
    },
    onSuccess: ({ challengeId }) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['prizePool', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
