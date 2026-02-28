import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getEdgeFunctionError } from '@/lib/edge-function';
import type { Challenge } from '@/types';

interface DeleteChallengeInput {
  challengeId: string;
  isPaid: boolean;
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, isPaid }: DeleteChallengeInput) => {
      if (isPaid) {
        // Paid challenges: server-side cancellation with refunds
        const { data, error } = await supabase.functions.invoke('cancel-challenge', {
          body: { challenge_id: challengeId },
        });

        if (error) {
          const msg = await getEdgeFunctionError(error);
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);

        return { challengeId };
      }

      // Free challenges: hard-delete (prize_distributions cascade via FK)
      const { error: partError } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId);

      if (partError) throw partError;

      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (error) throw error;

      return { challengeId };
    },
    onSuccess: ({ challengeId }) => {
      // Challenge is hard-deleted (both free and paid), remove stale queries
      queryClient.removeQueries({ queryKey: ['challenge', challengeId] });
      queryClient.removeQueries({ queryKey: ['prizePool', challengeId] });
      queryClient.removeQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
