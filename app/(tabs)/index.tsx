import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Flame, MapPin, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useDailyStats } from '@/hooks/useDailyStats';
import { useHomeLeaderboard } from '@/hooks/useHomeLeaderboard';
import { useHomeCTA } from '@/hooks/useHomeCTA';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useCurrentStreak } from '@/hooks/useStreak';
import { Avatar } from '@/components/ui/Avatar';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { StepProgressRing } from '@/components/ui/StepProgressRing';
import { StatCard } from '@/components/ui/StatCard';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
import { HeroCard } from '@/components/ui/HeroCard';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: stats, isPending: statsLoading, isError: statsError, refetch: refetchStats } = useDailyStats();
  const { data: leaderboard = [], isPending: leaderboardLoading, refetch: refetchLeaderboard } = useHomeLeaderboard();
  const { data: cta } = useHomeCTA();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: streak } = useCurrentStreak();

  const isLoading = statsLoading && leaderboardLoading;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchLeaderboard()]);
    setRefreshing(false);
  }, [refetchStats, refetchLeaderboard]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <LoadingState message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  if (statsError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ErrorState
          message="Could not load your dashboard"
          onRetry={() => { refetchStats(); refetchLeaderboard(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <View className="flex-row items-center">
            <Avatar
              uri={profile?.avatar_url}
              initials={firstName.charAt(0)}
              size="lg"
              border="primary"
            />
            <View className="ml-3">
              <Text className="text-xs text-muted-text uppercase tracking-wider font-semibold">
                Welcome back
              </Text>
              <Text className="text-lg font-bold text-neutral-dark">
                {profile?.full_name ?? 'User'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(social)/notifications')}
            className="w-10 h-10 rounded-full bg-white items-center justify-center border border-border"
          >
            <Bell size={20} color={Colors.neutralDark} />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-[9px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Streak + Step Progress Ring */}
        <View className="items-center py-6">
          {streak && (
            <View className="mb-3">
              <StreakBadge streak={streak.current_streak} freezes={streak.streak_freezes} />
            </View>
          )}
          <StepProgressRing
            steps={stats?.steps ?? 0}
            goal={stats?.goal ?? 10000}
          />
        </View>

        {/* Stats Grid */}
        <View className="flex-row px-6 gap-3 mb-6">
          <StatCard
            icon={<Flame size={20} color={Colors.neutralDark} />}
            value={`${stats?.calories ?? 0} kcal`}
            label="Calories"
          />
          <StatCard
            icon={<MapPin size={20} color={Colors.neutralDark} />}
            value={`${stats?.miles ?? 0} mi`}
            label="Miles"
          />
          <StatCard
            icon={<Clock size={20} color={Colors.neutralDark} />}
            value={`${stats?.activeMinutes ?? 0}m`}
            label="Mins"
          />
        </View>

        {/* Leaderboard */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-neutral-dark">Leaderboard</Text>
            <Badge style="lime">Daily</Badge>
          </View>
          {leaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.userId}
              rank={index + 1}
              name={entry.isCurrentUser ? (profile?.full_name ?? 'You') : entry.name}
              steps={entry.steps}
              maxSteps={leaderboard[0]?.steps ?? 1}
              avatarUri={entry.avatarUrl ?? undefined}
              isCurrentUser={entry.isCurrentUser}
            />
          ))}
          {leaderboard.length === 0 && (
            <Text className="text-sm text-muted-text text-center py-4">
              Join a challenge to see the leaderboard
            </Text>
          )}
        </View>

        {/* CTA Card */}
        {cta && (
          <View className="px-6 mb-8">
            <HeroCard
              title={cta.title}
              subtitle={cta.subtitle}
              buttonLabel="Join Challenge"
              onButtonPress={() => router.push(`/(challenge)/${cta.challengeId}/details`)}
            />
          </View>
        )}

        {/* Bottom spacer for absolute-positioned tab bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
