import React, { useCallback, useState } from 'react';
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
        {notifications.length === 0 ? (
          <View className="py-16 items-center">
            <Bell size={40} color={Colors.neutralMuted} />
            <Text className="text-muted-text text-sm mt-4">No notifications yet</Text>
          </View>
        ) : (
          notifications.map((notification) => (
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
