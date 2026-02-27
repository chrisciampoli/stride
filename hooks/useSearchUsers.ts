import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types';

export function useSearchUsers(query: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery<Profile[]>({
    queryKey: ['searchUsers', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, location, created_at, updated_at')
        .neq('id', user!.id)
        .ilike('full_name', `%${query}%`)
        .limit(20);

      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: !!user && query.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
