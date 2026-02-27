import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Challenge } from '@/types';

export function useFeatured() {
  return useQuery({
    queryKey: ['challenges', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*, challenge_participants(count)')
        .eq('is_community', true)
        .in('status', ['active', 'upcoming'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data ?? []) as (Challenge & { challenge_participants: { count: number }[] })[];
    },
  });
}

export function useTrending(category?: string) {
  return useQuery({
    queryKey: ['challenges', 'trending', category],
    queryFn: async () => {
      let query = supabase
        .from('challenges')
        .select('*, challenge_participants(count)')
        .eq('is_community', true)
        .in('status', ['active', 'upcoming']);

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
  });
}
