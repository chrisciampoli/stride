import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useSendNudge() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      // Send a nudge message
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: user!.id,
        receiver_id: targetUserId,
        content: '👋 nudged you! Keep going!',
        message_type: 'nudge',
      });

      if (msgError) throw msgError;

      // Create notification directly
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'nudge',
        title: 'You got nudged!',
        body: 'Someone nudged you to keep moving!',
        data: { sender_id: user!.id },
      });

      if (notifError) throw notifError;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', targetUserId] });
    },
  });
}
