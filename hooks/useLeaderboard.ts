import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useLeaderboard(challengeId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*, profile:profiles(id, full_name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('total_steps', { ascending: false })
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!challengeId,
  });

  // Realtime subscription for active challenges
  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel(`leaderboard-${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard', challengeId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);

  return query;
}
