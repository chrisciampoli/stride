import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useConversations } from '@/hooks/useMessages';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import type { Conversation } from '@/types';

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMessagePreview(conversation: Conversation): string {
  const prefix = conversation.isLastMessageSent ? 'You: ' : '';
  const content = conversation.lastMessage;

  if (conversation.lastMessageType === 'activity_share') {
    return `${prefix}Shared activity`;
  }
  if (conversation.lastMessageType === 'challenge_invite') {
    return `${prefix}Sent a challenge invite`;
  }
  if (conversation.lastMessageType === 'nudge') {
    return `${prefix}Sent a nudge`;
  }

  const maxLen = 45;
  const truncated = content.length > maxLen ? `${content.slice(0, maxLen)}...` : content;
  return `${prefix}${truncated}`;
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 bg-white rounded-xl px-4 mb-2 mx-6"
    >
      <Avatar
        uri={conversation.friendAvatarUrl}
        initials={conversation.friendName.charAt(0)}
        size="lg"
      />
      <View className="flex-1 ml-3 mr-2">
        <Text className="text-sm font-semibold text-neutral-dark" numberOfLines={1}>
          {conversation.friendName}
        </Text>
        <Text className="text-xs text-muted-text mt-0.5" numberOfLines={1}>
          {getMessagePreview(conversation)}
        </Text>
      </View>
      <Text className="text-xs text-muted-text">
        {formatTimestamp(conversation.lastMessageAt)}
      </Text>
    </Pressable>
  );
}

export default function InboxScreen() {
  const router = useRouter();
  const {
    data: conversations = [],
    isPending,
    isError,
    refetch,
  } = useConversations();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleConversationPress = useCallback(
    (friendId: string) => {
      router.push(`/(social)/message/${friendId}`);
    },
    [router],
  );

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Messages" />
        <View className="px-6 pt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Messages" />
        <ErrorState message="Could not load messages" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Messages" />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.friendId}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => handleConversationPress(item.friendId)}
          />
        )}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-6">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center mb-4">
              <MessageCircle size={28} color={Colors.mutedText} />
            </View>
            <Text className="text-base font-semibold text-neutral-dark mb-1">
              No messages yet
            </Text>
            <Text className="text-sm text-muted-text text-center">
              Start a conversation by visiting a friend&apos;s profile and tapping the message button.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
