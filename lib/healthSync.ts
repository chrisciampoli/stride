import { supabase } from '@/lib/supabase';
import { queryDailyTotals } from '@/lib/healthKit';
import { queryClient } from '@/lib/queryClient';
import type { HealthSyncResult } from '@/types';

export async function syncHealthData(
  userId: string,
  syncDays = 7,
): Promise<HealthSyncResult> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (syncDays - 1));

    const dailyData = await queryDailyTotals(startDate, endDate);

    if (dailyData.length === 0) {
      return { success: true, daysUpserted: 0 };
    }

    const rows = dailyData.map((d) => ({
      user_id: userId,
      date: d.date,
      steps: d.steps,
      calories: d.calories,
      distance_miles: d.distanceMiles,
      active_minutes: d.activeMinutes,
    }));

    const { error: upsertError } = await supabase
      .from('daily_steps')
      .upsert(rows, { onConflict: 'user_id,date' });

    if (upsertError) throw upsertError;

    const { error: settingsError } = await supabase
      .from('user_settings')
      .update({
        connected_device: 'apple_health',
        device_last_synced_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (settingsError) throw settingsError;

    // Update streak for today
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('update_user_streak', {
      p_user_id: userId,
      p_date: today,
    });

    queryClient.invalidateQueries({ queryKey: ['streak'] });
    queryClient.invalidateQueries({ queryKey: ['dailyStats'] });
    queryClient.invalidateQueries({ queryKey: ['weeklySteps'] });
    queryClient.invalidateQueries({ queryKey: ['friendsWeeklySteps'] });
    queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['userStats'] });
    queryClient.invalidateQueries({ queryKey: ['settings'] });

    return { success: true, daysUpserted: dailyData.length };
  } catch (error) {
    return {
      success: false,
      daysUpserted: 0,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

export async function disconnectHealthKit(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({
      connected_device: null,
      device_last_synced_at: null,
    })
    .eq('user_id', userId);

  if (error) throw error;

  queryClient.invalidateQueries({ queryKey: ['settings'] });
}
