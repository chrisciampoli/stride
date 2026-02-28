import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      // Delete prize distributions first (FK constraint)
      await supabase
        .from('prize_distributions')
        .delete()
        .eq('challenge_id', challengeId);

      // Delete participants (FK constraint)
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
    },
    onSuccess: (_data, challengeId) => {
      // Remove queries for the deleted challenge — invalidating would re-fetch
      // a row that no longer exists and .single() would throw
      queryClient.removeQueries({ queryKey: ['challenge', challengeId] });
      queryClient.removeQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.removeQueries({ queryKey: ['prizePool', challengeId] });
      // Invalidate list queries so they refetch without the deleted challenge
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
