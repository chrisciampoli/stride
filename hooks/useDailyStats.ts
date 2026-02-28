import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationSettings } from '@/hooks/useSettings';
import type { DailyStats } from '@/types';

export function useDailyStats() {
  const user = useAuthStore((s) => s.user);
  const { data: settings } = useNotificationSettings();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return useQuery<DailyStats>({
    queryKey: ['dailyStats', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_steps')
        .select('steps, calories, distance_miles, active_minutes')
        .eq('user_id', user!.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      return {
        steps: data?.steps ?? 0,
        goal: settings?.daily_step_goal ?? 10000,
        calories: data?.calories ?? 0,
        miles: data?.distance_miles ? Number(data.distance_miles) : 0,
        activeMinutes: data?.active_minutes ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}
