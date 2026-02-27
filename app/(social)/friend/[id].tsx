import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreVertical, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useFriendProfile } from '@/hooks/useFriends';
import { useFriendWeeklyStats, useMutualChallenges } from '@/hooks/useFriendStats';
import { useSendNudge } from '@/hooks/mutations/useSendNudge';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: friend, isPending: friendLoading, isError: friendError, refetch } = useFriendProfile(id);
  const { data: weeklySteps = 0, refetch: refetchWeekly } = useFriendWeeklyStats(id);
  const { data: mutualChallenges = [], refetch: refetchMutual } = useMutualChallenges(id);
  const sendNudge = useSendNudge();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchWeekly(), refetchMutual()]);
    setRefreshing(false);
  }, [refetch, refetchWeekly, refetchMutual]);

  const handleNudge = () => {
    sendNudge.mutate(id, {
      onSuccess: () => Alert.alert('Nudge Sent!', 'Your friend has been nudged 👋'),
    });
  };

  if (friendLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Friend Profile" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (friendError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Friend Profile" />
        <ErrorState message="Could not load profile" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Friend Profile"
        rightIcon={<MoreVertical size={20} color={Colors.neutralDark} />}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Avatar Hero */}
        <View className="items-center pt-6 pb-4">
          <Avatar
            uri={friend?.avatar_url}
            initials={friend?.full_name?.charAt(0) ?? '?'}
            size="xl"
            border="primary"
            showOnline
          />
          <Text className="text-xl font-bold text-neutral-dark mt-3">
            {friend?.full_name ?? 'Friend'}
          </Text>
          {friend?.bio && (
            <Text className="text-sm text-muted-text mt-1 italic">"{friend.bio}"</Text>
          )}
          <Text className="text-xs text-primary font-semibold mt-1 uppercase">
            ● Active Now
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row px-6 gap-3 mb-4">
          <StatCard
            icon={<TrendingUp size={18} color={Colors.neutralDark} />}
            value={weeklySteps.toLocaleString()}
            label="Weekly Steps"
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row px-6 gap-3 mb-6">
          <View className="flex-1">
            <Button variant="primary" size="md" fullWidth onPress={handleNudge}>
              Send Nudge
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => router.push(`/(social)/message/${id}`)}
            >
              Message
            </Button>
          </View>
        </View>

        {/* Mutual Challenges */}
        <View className="px-6 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-neutral-dark">Mutual Challenges</Text>
            {mutualChallenges.length > 0 && <Badge style="subtle">Active</Badge>}
          </View>
          {mutualChallenges.length === 0 ? (
            <Text className="text-sm text-muted-text text-center py-4">
              No mutual challenges yet
            </Text>
          ) : (
            mutualChallenges.map((mc) => (
              <Card key={mc.id} className="mb-3">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-neutral-dark">{mc.name}</Text>
                  {mc.category && <Badge style="subtle">{mc.category}</Badge>}
                </View>
                <View className="mb-2">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-muted-text">
                      {mc.friendName}
                    </Text>
                    <Text className="text-xs font-bold text-neutral-dark">{mc.friendSteps.toLocaleString()}</Text>
                  </View>
                  <ProgressBar progress={mc.goalSteps > 0 ? mc.friendSteps / mc.goalSteps : 0} height="thin" />
                </View>
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-muted-text">You</Text>
                    <Text className="text-xs font-bold text-neutral-dark">{mc.mySteps.toLocaleString()}</Text>
                  </View>
                  <ProgressBar progress={mc.goalSteps > 0 ? mc.mySteps / mc.goalSteps : 0} height="thin" />
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
