import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Challenge, Profile } from '@/types';

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export function useFriendWeeklyStats(friendId: string) {
  const { start, end } = getWeekRange();

  return useQuery<number>({
    queryKey: ['friendWeeklyStats', friendId, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', friendId)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + (r.steps ?? 0), 0);
    },
    enabled: !!friendId,
  });
}

export interface MutualChallenge {
  id: string;
  name: string;
  category: string | null;
  goalSteps: number;
  friendSteps: number;
  mySteps: number;
  friendName: string;
}

export function useMutualChallenges(friendId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery<MutualChallenge[]>({
    queryKey: ['mutualChallenges', user?.id, friendId],
    queryFn: async () => {
      // Get challenges the current user participates in
      const { data: myParticipations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, total_steps')
        .eq('user_id', user!.id);

      // Get challenges the friend participates in
      const { data: friendParticipations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, total_steps')
        .eq('user_id', friendId);

      if (!myParticipations || !friendParticipations) return [];

      const myMap = new Map(myParticipations.map((p) => [p.challenge_id, p.total_steps]));
      const mutualIds = friendParticipations
        .filter((fp) => myMap.has(fp.challenge_id))
        .map((fp) => fp.challenge_id);

      if (mutualIds.length === 0) return [];

      // Get challenge details
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, name, category, goal_steps, status')
        .in('id', mutualIds)
        .eq('status', 'active');

      // Get friend profile name
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', friendId)
        .single();

      return (challenges ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        goalSteps: c.goal_steps,
        friendSteps: friendParticipations.find((fp) => fp.challenge_id === c.id)?.total_steps ?? 0,
        mySteps: myMap.get(c.id) ?? 0,
        friendName: friendProfile?.full_name ?? 'Friend',
      }));
    },
    enabled: !!user && !!friendId,
  });
}
