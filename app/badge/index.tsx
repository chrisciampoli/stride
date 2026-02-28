import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Award, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAllBadges, useUserBadges } from '@/hooks/useBadges';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Badge } from '@/types';

export default function BadgesListScreen() {
  const router = useRouter();
  const { data: allBadges = [], isPending, isError, refetch } = useAllBadges();
  const { data: userBadges = [], refetch: refetchUserBadges } = useUserBadges();
  const [filter, setFilter] = React.useState<'all' | 'earned'>('all');

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));
  const earnedCount = allBadges.filter((b) => earnedBadgeIds.has(b.id)).length;

  const filteredBadges = filter === 'earned'
    ? allBadges.filter((b) => earnedBadgeIds.has(b.id))
    : allBadges;

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUserBadges()]);
    setRefreshing(false);
  }, [refetch, refetchUserBadges]);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="All Badges" />
        <LoadingState message="Loading badges..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="All Badges" />
        <ErrorState message="Could not load badges" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const renderBadge = ({ item }: { item: Badge }) => {
    const earned = earnedBadgeIds.has(item.id);
    const userProgress = userBadges.find((ub) => ub.badge_id === item.id);
    const progress = item.requirement_value
      ? (userProgress?.progress ?? 0) / item.requirement_value
      : 0;

    return (
      <Pressable
        onPress={() => router.push(`/badge/${item.id}`)}
        className="flex-1 m-1.5"
      >
        <View
          className={`bg-white rounded-xl p-3 items-center border ${
            earned ? 'border-primary/30' : 'border-border'
          }`}
          style={earned ? {
            shadowColor: '#E85D0A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
          } : {}}
        >
          <View className="relative mb-2">
            <View
              className={`w-14 h-14 rounded-full items-center justify-center ${
                earned ? 'bg-primary/20' : 'bg-neutral-dark/5'
              }`}
            >
              <Award
                size={28}
                color={earned ? Colors.neutralDark : '#c4c4c4'}
              />
            </View>
            {earned && (
              <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success items-center justify-center">
                <Check size={12} color={Colors.white} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text
            className={`text-xs text-center font-semibold mb-1 ${
              earned ? 'text-neutral-dark' : 'text-muted-text'
            }`}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {!earned && item.requirement_value && (
            <View className="w-full mt-1">
              <ProgressBar progress={Math.min(progress, 1)} height="thin" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="All Badges" />
      <FlatList
        data={filteredBadges}
        renderItem={renderBadge}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-4 px-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-neutral-dark">
                {earnedCount} of {allBadges.length} Earned
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full border ${
                  filter === 'all' ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text className={`text-xs font-medium ${filter === 'all' ? 'text-neutral-dark' : 'text-muted-text'}`}>
                  All
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFilter('earned')}
                className={`px-4 py-1.5 rounded-full border ${
                  filter === 'earned' ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text className={`text-xs font-medium ${filter === 'earned' ? 'text-neutral-dark' : 'text-muted-text'}`}>
                  Earned ({earnedCount})
                </Text>
              </Pressable>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}
