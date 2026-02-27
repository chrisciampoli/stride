import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Message, MessageType } from '@/types';

export function useConversation(friendId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['messages', friendId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user!.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!user && !!friendId,
    refetchInterval: 15000,
  });
}

export function useSendMessage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
      messageType = 'text',
      metadata = {},
    }: {
      receiverId: string;
      content: string;
      messageType?: MessageType;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user!.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.receiverId],
      });
    },
  });
}
