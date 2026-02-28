import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getEdgeFunctionError } from '@/lib/edge-function';
import { useAuthStore } from '@/stores/authStore';

interface JoinPaidChallengeInput {
  challengeId: string;
  challengeName: string;
}

export function useJoinPaidChallenge() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ challengeId, challengeName }: JoinPaidChallengeInput) => {
      // Step 1: Create PaymentIntent via edge function
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'create-payment-intent',
        { body: { challenge_id: challengeId } },
      );

      if (fnError) {
        const msg = await getEdgeFunctionError(fnError);
        throw new Error(msg);
      }

      // Server recovered an already-succeeded payment (webhook was slow)
      if (result?.alreadyPaid) {
        return { challengeId, paymentIntentId: result.paymentIntentId ?? '' };
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

      // Optimistic challenge update — mark participant as paid so isJoined is true immediately
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(['challenge', challengeId], (old: any) => {
          if (!old) return old;
          const participants = old.challenge_participants ?? [];
          const alreadyPaid = participants.some(
            (p: { user_id: string; payment_status: string }) =>
              p.user_id === user.id && p.payment_status === 'paid',
          );
          if (alreadyPaid) return old;
          // Update existing pending participant or add a new one
          const existingIdx = participants.findIndex(
            (p: { user_id: string }) => p.user_id === user.id,
          );
          const updatedParticipants = [...participants];
          if (existingIdx >= 0) {
            updatedParticipants[existingIdx] = {
              ...updatedParticipants[existingIdx],
              payment_status: 'paid',
            };
          } else {
            updatedParticipants.push({
              id: `optimistic-${Date.now()}`,
              user_id: user.id,
              total_steps: 0,
              payment_status: 'paid',
              profile: null,
            });
          }
          return { ...old, challenge_participants: updatedParticipants };
        });
      }

      // Invalidate list queries that don't have optimistic updates
      // NOTE: Do NOT invalidate 'challenge' or 'prizePool' — let the realtime
      // subscription and 30s polling confirm the data after the webhook fires.
      // Invalidating immediately would refetch stale DB data and overwrite
      // the optimistic values above.
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
