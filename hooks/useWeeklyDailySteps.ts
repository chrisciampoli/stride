import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getWeekRange } from '@/lib/format';

export interface WeeklyDayData {
  day: string;
  steps: number;
  date: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeekDays(start: string): { date: string; day: string }[] {
  const monday = new Date(start + 'T00:00:00');
  return DAY_LABELS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, day };
  });
}

export function useWeeklyDailySteps() {
  const user = useAuthStore((s) => s.user);
  const { start, end } = getWeekRange();

  return useQuery<WeeklyDayData[]>({
    queryKey: ['weeklyDailySteps', user?.id, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_steps')
        .select('date, steps')
        .eq('user_id', user!.id)
        .gte('date', start)
        .lte('date', end)
        .order('date');

      if (error) throw error;

      const stepsByDate: Record<string, number> = {};
      for (const row of data ?? []) {
        stepsByDate[row.date] = row.steps ?? 0;
      }

      const weekDays = buildWeekDays(start);
      return weekDays.map(({ date, day }) => ({
        day,
        steps: stepsByDate[date] ?? 0,
        date,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}
