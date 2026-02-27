import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileUpdateInput } from '@/types';

export function useUpdateProfile() {
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdateInput) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      fetchProfile();
      queryClient.invalidateQueries({ queryKey: ['userStats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
