import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Badge, UserBadge } from '@/types';

export function useAllBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Badge[];
    },
  });
}

export function useUserBadges() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', user!.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as (UserBadge & { badge: Badge })[];
    },
    enabled: !!user,
  });
}

export function useBadgeDetail(id: string) {
  return useQuery({
    queryKey: ['badge', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Badge;
    },
    enabled: !!id,
  });
}

export function useUserBadgeForBadge(badgeId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['userBadgeForBadge', user?.id, badgeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user!.id)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (error) throw error;
      return data as UserBadge | null;
    },
    enabled: !!user && !!badgeId,
  });
}
