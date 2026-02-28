import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Activity, Trophy } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useFriendProfile } from '@/hooks/useFriends';
import { useConversation, useSendMessage } from '@/hooks/useMessages';
import { useDailyStats } from '@/hooks/useDailyStats';
import { Avatar } from '@/components/ui/Avatar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { QuickAction } from '@/components/chat/QuickAction';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';

export default function DirectMessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: friend, isPending: friendLoading } = useFriendProfile(id);
  const { data: messages = [], isPending: messagesLoading, isError: messagesError, refetch: refetchMessages } = useConversation(id);
  const sendMessage = useSendMessage();
  const { data: todayStats } = useDailyStats();
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate(
      { receiverId: id, content: text.trim() },
      { onSuccess: () => setText('') }
    );
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (friendLoading || messagesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
          <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center mr-1">
            <Text className="text-2xl">{'\u2190'}</Text>
          </Pressable>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text className="ml-3 text-base font-bold text-neutral-dark">Loading...</Text>
        </View>
        <View className="flex-1 px-4 pt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (messagesError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
          <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center mr-1">
            <Text className="text-2xl">{'\u2190'}</Text>
          </Pressable>
          <Text className="text-base font-bold text-neutral-dark">Messages</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[#1A1208] text-lg font-semibold mb-2">Something went wrong</Text>
          <Text className="text-[#A07850] text-center mb-4">Could not load messages. Please try again.</Text>
          <TouchableOpacity onPress={() => refetchMessages()} className="bg-[#E85D0A] px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
        <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center mr-1">
          <Text className="text-2xl">←</Text>
        </Pressable>
        <Avatar
          uri={friend?.avatar_url}
          initials={friend?.full_name?.charAt(0) ?? '?'}
          size="md"
        />
        <View className="flex-1 ml-3">
          <Text className="text-base font-bold text-neutral-dark">
            {friend?.full_name ?? 'Friend'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Date separator */}
          <Text className="text-xs text-muted-text text-center mb-4 uppercase font-semibold">
            Today
          </Text>

          {messages.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-muted-text text-sm">No messages yet. Say hi!</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content ?? ''}
                isSent={msg.sender_id === user?.id}
                time={formatTime(msg.created_at)}
                isActivity={msg.message_type === 'activity_share'}
                activityTitle={msg.message_type === 'activity_share' ? 'Activity Share' : undefined}
              />
            ))
          )}
          <View className="h-4" />
        </ScrollView>

        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <QuickAction
            icon={<Activity size={14} color={Colors.neutralDark} />}
            label="Share Activity"
            onPress={() => {
              sendMessage.mutate({
                receiverId: id,
                content: `Today's steps: ${todayStats?.steps?.toLocaleString() ?? '0'}`,
                messageType: 'activity_share',
                metadata: { steps: todayStats?.steps ?? 0 },
              });
            }}
          />
          <QuickAction
            icon={<Trophy size={14} color={Colors.neutralDark} />}
            label="Challenge"
            onPress={() => router.push('/(challenge)/create')}
          />
        </ScrollView>

        {/* Input Footer */}
        <View className="flex-row items-center px-4 pb-2 gap-2">
          <View className="flex-1 bg-white border border-border rounded-full px-4 h-10 justify-center">
            <TextInput
              className="text-sm text-neutral-dark"
              placeholder="Send some motivation..."
              placeholderTextColor={Colors.mutedText}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
          </View>
          <Pressable
            onPress={handleSend}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          >
            <Send size={18} color={Colors.neutralDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
