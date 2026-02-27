import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface UserStats {
  totalSteps: number;
  challengesWon: number;
  bestDay: number;
}

export function useUserStats() {
  const user = useAuthStore((s) => s.user);

  return useQuery<UserStats>({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      const userId = user!.id;

      // 1. Total steps from daily_steps (HealthKit-synced data)
      const { data: stepsRows } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', userId);

      const totalSteps = (stepsRows ?? []).reduce(
        (sum, row) => sum + (row.steps || 0),
        0
      );

      // 2. Challenges won: fetch completed challenges and their top participant in one go
      // Get all completed challenge IDs the user participated in
      const { data: completedParticipations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, total_steps, challenges!inner(status)')
        .eq('user_id', userId)
        .eq('challenges.status', 'completed');

      let challengesWon = 0;

      if (completedParticipations && completedParticipations.length > 0) {
        const challengeIds = completedParticipations.map((cp) => cp.challenge_id);

        // Fetch top participant (by total_steps desc) for each completed challenge
        // Get all participants for these challenges, then determine winners client-side
        const { data: allParticipants } = await supabase
          .from('challenge_participants')
          .select('challenge_id, user_id, total_steps')
          .in('challenge_id', challengeIds)
          .order('total_steps', { ascending: false });

        if (allParticipants) {
          // Group by challenge_id and check if user is top
          const topByChallenge = new Map<string, string>();
          for (const p of allParticipants) {
            if (!topByChallenge.has(p.challenge_id)) {
              topByChallenge.set(p.challenge_id, p.user_id);
            }
          }
          for (const winnerId of topByChallenge.values()) {
            if (winnerId === userId) challengesWon++;
          }
        }
      }

      // 3. Best single day from daily_steps
      const { data: bestDayRow } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', userId)
        .order('steps', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        totalSteps,
        challengesWon,
        bestDay: bestDayRow?.steps ?? 0,
      };
    },
    enabled: !!user,
  });
}
