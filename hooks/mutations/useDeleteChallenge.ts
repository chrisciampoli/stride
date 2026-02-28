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
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['prizePool', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
