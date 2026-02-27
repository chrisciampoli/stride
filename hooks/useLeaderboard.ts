import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useLeaderboard(challengeId: string) {
  return useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*, profile:profiles(id, full_name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('total_steps', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!challengeId,
  });
}
