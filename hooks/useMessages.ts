import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Message, MessageType, Conversation } from '@/types';

export function useConversation(friendId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
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
  });

  // Realtime subscription for incoming messages from this friend
  useEffect(() => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as { sender_id: string };
          if (newMessage.sender_id === friendId) {
            queryClient.invalidateQueries({ queryKey: ['messages', friendId] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friendId, queryClient]);

  return query;
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
      queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
  });
}

interface MessageWithProfile extends Message {
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null;
  receiver: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Fetch recent messages where user is sender or receiver, with profile info
      // We fetch the most recent messages and deduplicate by partner on the client
      const { data: sent, error: sentError } = await supabase
        .from('messages')
        .select('*, receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)')
        .eq('sender_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (sentError) throw sentError;

      const { data: received, error: receivedError } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
        .eq('receiver_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (receivedError) throw receivedError;

      // Build a map of partner_id -> latest message
      const conversationMap = new Map<string, Conversation>();

      for (const msg of (sent ?? []) as unknown as MessageWithProfile[]) {
        const partner = msg.receiver;
        if (!partner) continue;
        const existing = conversationMap.get(partner.id);
        if (!existing || new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
          conversationMap.set(partner.id, {
            friendId: partner.id,
            friendName: partner.full_name ?? 'Unknown',
            friendAvatarUrl: partner.avatar_url,
            lastMessage: msg.content ?? '',
            lastMessageAt: msg.created_at,
            lastMessageType: msg.message_type,
            isLastMessageSent: true,
          });
        }
      }

      for (const msg of (received ?? []) as unknown as MessageWithProfile[]) {
        const partner = msg.sender;
        if (!partner) continue;
        const existing = conversationMap.get(partner.id);
        if (!existing || new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
          conversationMap.set(partner.id, {
            friendId: partner.id,
            friendName: partner.full_name ?? 'Unknown',
            friendAvatarUrl: partner.avatar_url,
            lastMessage: msg.content ?? '',
            lastMessageAt: msg.created_at,
            lastMessageType: msg.message_type,
            isLastMessageSent: false,
          });
        }
      }

      // Sort by most recent message
      return Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    },
    enabled: !!user,
  });

  // Realtime subscription for new messages to refresh conversations list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}
