import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface JoinChallengeInput {
  challengeId: string;
  isPaid?: boolean;
}

export function useJoinChallenge() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  return useMutation({
    mutationFn: async (input: string | JoinChallengeInput) => {
      // Support both old API (string) and new API (object)
      const challengeId = typeof input === 'string' ? input : input.challengeId;
      const isPaid = typeof input === 'string' ? false : (input.isPaid ?? false);

      if (isPaid) {
        // Paid challenges should use useJoinPaidChallenge instead
        throw new Error('Use useJoinPaidChallenge for paid challenges');
      }

      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      const challengeId = typeof input === 'string' ? input : input.challengeId;
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
      showToast('Joined challenge!', 'success');
    },
  });
}
