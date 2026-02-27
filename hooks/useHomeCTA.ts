import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Challenge } from '@/types';

export interface HomeCTA {
  challengeId: string;
  title: string;
  subtitle: string;
}

export function useHomeCTA() {
  const user = useAuthStore((s) => s.user);

  return useQuery<HomeCTA | null>({
    queryKey: ['homeCTA', user?.id],
    queryFn: async () => {
      // Get challenge IDs the user has already joined
      const { data: joined } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', user!.id);

      const joinedIds = (joined ?? []).map((j) => j.challenge_id);

      // Find a community challenge the user hasn't joined
      let query = supabase
        .from('challenges')
        .select('id, name, challenge_participants(count)')
        .eq('is_community', true)
        .in('status', ['active', 'upcoming'])
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: candidates, error } = await query;
      if (error) throw error;

      const match = (candidates ?? []).find((c) => !joinedIds.includes(c.id));
      if (!match) return null;

      const count = (match as { challenge_participants: { count: number }[] }).challenge_participants?.[0]?.count ?? 0;

      return {
        challengeId: match.id,
        title: match.name,
        subtitle: `Join ${count > 0 ? count.toLocaleString() : 'others'} in this challenge`,
      };
    },
    enabled: !!user,
  });
}
