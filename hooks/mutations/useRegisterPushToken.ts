import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getPlatform } from '@/lib/pushNotifications';

export function useRegisterPushToken() {
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user!.id,
            token,
            platform: getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' },
        );

      if (error) throw error;
    },
  });
}
