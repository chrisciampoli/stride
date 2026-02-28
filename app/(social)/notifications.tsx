import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Trophy, Award, UserPlus, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { Notification, NotificationType } from '@/types';

type NotificationGroup = {
  key: string;
  type: NotificationType;
  items: Notification[];
  title: string;
  body: string;
  latestDate: string;
  isRead: boolean;
  challengeId?: string;
};

function groupNotifications(notifications: Notification[]): (Notification | NotificationGroup)[] {
  const groupableTypes: NotificationType[] = ['challenge_invite', 'friend_request', 'friend_accepted', 'nudge'];
  const result: (Notification | NotificationGroup)[] = [];
  let i = 0;

  while (i < notifications.length) {
    const current = notifications[i];
    const data = current.data as Record<string, string> | null;
    const groupKey = groupableTypes.includes(current.type)
      ? `${current.type}:${data?.challenge_id ?? 'global'}`
      : null;

    if (!groupKey) {
      result.push(current);
      i++;
      continue;
    }

    // Collect consecutive same-group items (within 24 hours of each other)
    const items: Notification[] = [current];
    let j = i + 1;
    while (j < notifications.length) {
      const next = notifications[j];
      const nextData = next.data as Record<string, string> | null;
      const nextKey = `${next.type}:${nextData?.challenge_id ?? 'global'}`;
      if (nextKey !== groupKey) break;

      const timeDiff = new Date(current.created_at).getTime() - new Date(next.created_at).getTime();
      if (timeDiff > 24 * 60 * 60 * 1000) break;

      items.push(next);
      j++;
    }

    if (items.length === 1) {
      result.push(current);
    } else {
      const groupTitle = getGroupTitle(current.type, items.length);
      result.push({
        key: `group-${groupKey}-${current.created_at}`,
        type: current.type,
        items,
        title: groupTitle,
        body: items.map((n) => n.title).slice(0, 3).join(', ') + (items.length > 3 ? '...' : ''),
        latestDate: items[0].created_at,
        isRead: items.every((n) => n.read_at !== null),
        challengeId: data?.challenge_id,
      });
    }
    i = j;
  }
  return result;
}

function getGroupTitle(type: NotificationType, count: number): string {
  switch (type) {
    case 'challenge_invite':
      return `${count} challenge invites`;
    case 'friend_request':
      return `${count} friend requests`;
    case 'friend_accepted':
      return `${count} friends accepted`;
    case 'nudge':
      return `${count} nudges`;
    default:
      return `${count} notifications`;
  }
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'challenge_invite':
    case 'challenge_started':
    case 'challenge_completed':
      return <Bell size={20} color={Colors.neutralDark} />;
    case 'rank_change':
      return <Trophy size={20} color={Colors.neutralDark} />;
    case 'badge_earned':
      return <Award size={20} color={Colors.neutralDark} />;
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus size={20} color={Colors.neutralDark} />;
    case 'nudge':
      return <Zap size={20} color={Colors.neutralDark} />;
    default:
      return <Bell size={20} color={Colors.neutralDark} />;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications = [], isPending: notificationsLoading, isError: notificationsError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [refreshing, setRefreshing] = useState(false);
  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = (notification: Notification) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }

    const data = notification.data as Record<string, string>;
    switch (notification.type) {
      case 'challenge_invite':
      case 'challenge_started':
      case 'challenge_completed':
        if (data?.challenge_id) {
          router.push(`/(challenge)/${data.challenge_id}/details`);
        }
        break;
      case 'rank_change':
        if (data?.challenge_id) {
          router.push(`/(challenge)/${data.challenge_id}/leaderboard`);
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
        router.push('/(tabs)/friends');
        break;
      case 'nudge':
        if (data?.sender_id) {
          router.push(`/(social)/message/${data.sender_id}`);
        }
        break;
      default:
        break;
    }
  };

  if (notificationsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Notifications" />
        <LoadingState message="Loading notifications..." />
      </SafeAreaView>
    );
  }

  if (notificationsError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Notifications" />
        <ErrorState message="Could not load notifications" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Notifications"
        rightIcon={
          <Pressable onPress={() => markAllRead.mutate()}>
            <Text className="text-xs font-bold text-muted-text uppercase">Mark All Read</Text>
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {grouped.length === 0 ? (
          <View className="py-16 items-center">
            <Bell size={40} color={Colors.neutralMuted} />
            <Text className="text-muted-text text-sm mt-4">No notifications yet</Text>
          </View>
        ) : (
          grouped.map((item) => {
            if ('items' in item) {
              // Grouped notification
              const group = item as NotificationGroup;
              return (
                <Pressable
                  key={group.key}
                  onPress={() => {
                    group.items.forEach((n) => {
                      if (!n.read_at) markRead.mutate(n.id);
                    });
                    // Navigate to the most relevant destination
                    const first = group.items[0];
                    handlePress(first);
                  }}
                  className={`flex-row items-start px-6 py-4 border-b border-border ${
                    !group.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-white border border-border items-center justify-center mr-3">
                    {getNotificationIcon(group.type)}
                    <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary items-center justify-center">
                      <Text className="text-[9px] text-white font-bold">{group.items.length}</Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-bold text-neutral-dark flex-1">
                        {group.title}
                      </Text>
                      {!group.isRead && (
                        <View className="w-2 h-2 rounded-full bg-primary ml-2" />
                      )}
                    </View>
                    <Text className="text-xs text-muted-text mt-0.5" numberOfLines={2}>
                      {group.body}
                    </Text>
                    <Text className="text-[10px] text-muted-text mt-1">
                      {getTimeAgo(group.latestDate)}
                    </Text>
                  </View>
                </Pressable>
              );
            }

            // Individual notification
            const notification = item as Notification;
            return (
              <Pressable
                key={notification.id}
                onPress={() => handlePress(notification)}
                className={`flex-row items-start px-6 py-4 border-b border-border ${
                  !notification.read_at ? 'bg-primary/5' : ''
                }`}
              >
                <View className="w-10 h-10 rounded-full bg-white border border-border items-center justify-center mr-3">
                  {getNotificationIcon(notification.type)}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-neutral-dark flex-1">
                      {notification.title}
                    </Text>
                    {!notification.read_at && (
                      <View className="w-2 h-2 rounded-full bg-primary ml-2" />
                    )}
                  </View>
                  {notification.body && (
                    <Text className="text-xs text-muted-text mt-0.5">{notification.body}</Text>
                  )}
                  <Text className="text-[10px] text-muted-text mt-1">
                    {getTimeAgo(notification.created_at)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
