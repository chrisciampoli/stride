import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

        if (error) throw new Error(error.message || 'Failed to cancel challenge');
        if (data?.error) throw new Error(data.error);

        return { challengeId };
      }

      // Free challenges: keep existing hard-delete behavior
      await supabase
        .from('prize_distributions')
        .delete()
        .eq('challenge_id', challengeId);

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
    onSuccess: ({ challengeId }, { isPaid }) => {
      if (isPaid) {
        // Paid: challenge still exists (soft-delete), invalidate to refetch with new status
        queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['prizePool', challengeId] });
      } else {
        // Free: challenge is deleted, remove stale queries
        queryClient.removeQueries({ queryKey: ['challenge', challengeId] });
        queryClient.removeQueries({ queryKey: ['prizePool', challengeId] });
      }
      queryClient.removeQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
