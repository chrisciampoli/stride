import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Challenge } from '@/types';

export function useChallengeDetail(id: string) {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*, challenge_participants(id, user_id, total_steps, payment_status, profile:profiles(id, full_name, avatar_url))')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
