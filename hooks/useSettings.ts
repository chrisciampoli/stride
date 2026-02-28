import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserSettings } from '@/types';

export function useNotificationSettings() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data ?? {}) as UserSettings;
    },
    enabled: !!user,
  });
}

export function useUpdateSettings() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });
}
