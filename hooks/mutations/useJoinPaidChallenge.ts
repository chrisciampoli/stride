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
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'create-payment-intent',
        { body: { challenge_id: challengeId } },
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to create payment');
      }

      if (!result?.clientSecret) {
        throw new Error(result?.error || 'Failed to create payment');
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
        if (presentError.code === 'Canceled') {
          // Clean up pending participant record — best-effort
          try {
            await supabase.functions.invoke('cancel-payment', {
              body: { payment_intent_id: result.paymentIntentId },
            });
          } catch {
            // Best-effort cleanup — create-payment-intent handles stale records on retry
          }
          throw new Error('Payment cancelled');
        }
        throw new Error(presentError.message);
      }

      // Payment succeeded — webhook will confirm and update participant status
      return { challengeId, paymentIntentId: result.paymentIntentId };
    },
    onSuccess: ({ challengeId }) => {
      // Optimistic prize pool update
      queryClient.setQueryData(['prizePool', challengeId], (old: Record<string, unknown> | null | undefined) => {
        if (!old) return old;
        return {
          ...old,
          prizePoolCents: (old.prizePoolCents as number) + (old.entryFeeCents as number),
          paidParticipantCount: (old.paidParticipantCount as number) + 1,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['prizePool', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
