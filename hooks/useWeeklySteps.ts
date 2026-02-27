import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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

export function useWeeklySteps(userId?: string) {
  const user = useAuthStore((s) => s.user);
  const targetId = userId ?? user?.id;
  const { start, end } = getWeekRange();

  return useQuery<number>({
    queryKey: ['weeklySteps', targetId, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', targetId!)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + (r.steps ?? 0), 0);
    },
    enabled: !!targetId,
  });
}

export function useFriendsWeeklySteps(friendIds: string[]) {
  const { start, end } = getWeekRange();

  return useQuery<Record<string, number>>({
    queryKey: ['friendsWeeklySteps', friendIds, start],
    queryFn: async () => {
      if (friendIds.length === 0) return {};

      const { data, error } = await supabase
        .from('daily_steps')
        .select('user_id, steps')
        .in('user_id', friendIds)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const result: Record<string, number> = {};
      for (const id of friendIds) result[id] = 0;
      for (const row of data ?? []) {
        result[row.user_id] = (result[row.user_id] ?? 0) + (row.steps ?? 0);
      }
      return result;
    },
    enabled: friendIds.length > 0,
  });
}
