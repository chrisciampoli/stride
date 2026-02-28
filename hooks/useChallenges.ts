import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Challenge, ChallengeParticipant } from '@/types';

export type ChallengeWithCount = Challenge & {
  challenge_participants: Pick<ChallengeParticipant, 'user_id' | 'total_steps'>[];
  participantCount: number;
};

async function fetchChallengesWithCounts(
  userId: string,
  statusFilter: string | string[],
  orderColumn: 'start_date' | 'end_date',
  orderAsc: boolean
): Promise<ChallengeWithCount[]> {
  // 1. Get challenges the user participates in (with their own steps)
  const statusArray = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('*, challenge_participants!inner(user_id, total_steps)')
    .in('status', statusArray)
    .eq('challenge_participants.user_id', userId)
    .order(orderColumn, { ascending: orderAsc });

  if (error) throw error;
  if (!challenges || challenges.length === 0) return [];

  // 2. Get participant counts for these challenges in a single query
  const challengeIds = challenges.map((c) => c.id);
  const { data: countRows } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .in('challenge_id', challengeIds);

  // Count participants per challenge client-side
  const countMap = new Map<string, number>();
  for (const row of countRows ?? []) {
    countMap.set(row.challenge_id, (countMap.get(row.challenge_id) ?? 0) + 1);
  }

  return challenges.map((c) => ({
    ...c,
    participantCount: countMap.get(c.id) ?? 0,
  })) as ChallengeWithCount[];
}

export function useActiveChallenges() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['challenges', 'active', user?.id],
    queryFn: () => fetchChallengesWithCounts(user!.id, ['active', 'upcoming', 'cancelled'], 'start_date', true),
    enabled: !!user,
  });
}

export function useCompletedChallenges() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['challenges', 'completed', user?.id],
    queryFn: () => fetchChallengesWithCounts(user!.id, ['completed'], 'end_date', false),
    enabled: !!user,
  });
}
