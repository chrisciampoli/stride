import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  steps: number;
  avatarUrl: string | null;
  isCurrentUser: boolean;
}

export function useHomeLeaderboard() {
  const user = useAuthStore((s) => s.user);

  return useQuery<LeaderboardEntry[]>({
    queryKey: ['homeLeaderboard', user?.id],
    queryFn: async () => {
      // Find user's first active challenge
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, challenges!inner(status)')
        .eq('user_id', user!.id)
        .eq('challenges.status', 'active')
        .limit(1);

      if (!participations || participations.length === 0) return [];

      const challengeId = participations[0].challenge_id;

      // Get leaderboard for that challenge
      const { data: leaderboard, error } = await supabase
        .from('challenge_participants')
        .select('user_id, total_steps, profile:profiles(id, full_name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('total_steps', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (leaderboard ?? []).map((entry) => {
        const profile = entry.profile as unknown as Profile;
        return {
          userId: entry.user_id,
          name: profile?.full_name ?? 'Unknown',
          steps: entry.total_steps,
          avatarUrl: profile?.avatar_url ?? null,
          isCurrentUser: entry.user_id === user!.id,
        };
      });
    },
    enabled: !!user,
  });
}
