import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { StreakInfo } from '@/types';

export function useCurrentStreak() {
  const user = useAuthStore((s) => s.user);

  return useQuery<StreakInfo>({
    queryKey: ['streak', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('current_streak, longest_streak, streak_freezes, last_streak_date, daily_step_goal')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;

      return {
        current_streak: data.current_streak ?? 0,
        longest_streak: data.longest_streak ?? 0,
        streak_freezes: data.streak_freezes ?? 0,
        last_streak_date: data.last_streak_date,
        daily_step_goal: data.daily_step_goal ?? 10000,
      };
    },
    enabled: !!user,
  });
}
