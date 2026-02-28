import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Users } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useFeatured, useTrending } from '@/hooks/useDiscoverChallenges';
import { useJoinChallenge } from '@/hooks/mutations/useJoinChallenge';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { FeaturedChallengeCard } from '@/components/ui/FeaturedChallengeCard';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

const categories = ['All', 'Marathon', 'Daily Streak', 'Beginner Friendly', 'Competitive'];

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { data: featured = [], isPending: featuredLoading, isError: featuredError, refetch: refetchFeatured } = useFeatured();
  const { data: trending = [], isPending: trendingLoading, isError: trendingError, refetch: refetchTrending } = useTrending(selectedCategory);
  const joinChallenge = useJoinChallenge();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const [refreshing, setRefreshing] = useState(false);

  const filteredTrending = useMemo(
    () => search
      ? trending.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      : trending,
    [trending, search],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchTrending()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchTrending]);

  const featuredChallenge = featured[0];

  const isLoading = featuredLoading && trendingLoading;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <LoadingState message="Loading challenges..." />
      </SafeAreaView>
    );
  }

  if (featuredError && trendingError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ErrorState
          message="Could not load challenges"
          onRetry={() => { refetchFeatured(); refetchTrending(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Discover"
        rightIcon={
          <View>
            <Bell size={20} color={Colors.neutralDark} />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-[9px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        }
        onRightPress={() => router.push('/(social)/notifications')}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Search */}
        <View className="px-6 mb-4">
          <SearchBar
            placeholder="Search global challenges..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Featured */}
        <View className="px-6 mb-4">
          <Text className="text-lg font-bold text-neutral-dark mb-3">Featured</Text>
          {featuredChallenge && (
            <FeaturedChallengeCard
              title={featuredChallenge.name}
              subtitle={`${(featuredChallenge.goal_steps / 1000).toFixed(0)}km goal · ${(featuredChallenge.challenge_participants?.[0]?.count ?? 0).toLocaleString()} participants`}
              badge={featuredChallenge.category ?? 'Major Event'}
              onPress={() => router.push(`/(challenge)/${featuredChallenge.id}/details`)}
            />
          )}
        </View>

        {/* Category Pills */}
        <View className="mb-4">
          <CategoryPills
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Trending */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-bold text-neutral-dark mb-3">Trending</Text>
          {filteredTrending.length === 0 && search ? (
            <Text className="text-sm text-muted-text text-center py-4">
              No challenges matching &apos;{search}&apos;
            </Text>
          ) : (
            filteredTrending.map((challenge) => {
              const isJoining = joinChallenge.isPending && joinChallenge.variables === challenge.id;
              return (
                <View
                  key={challenge.id}
                  className="flex-row items-center py-3 bg-white rounded-xl px-4 mb-2 border border-border"
                >
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Text className="text-lg">🏃</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-neutral-dark" numberOfLines={1}>
                      {challenge.name}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Users size={12} color={Colors.neutralMuted} />
                      <Text className="text-xs text-muted-text ml-1">
                        {challenge.challenge_participants?.[0]?.count ?? 0} joined
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (challenge.is_paid) {
                        router.push(`/(challenge)/${challenge.id}/details`);
                      } else {
                        joinChallenge.mutate(challenge.id);
                      }
                    }}
                    disabled={isJoining}
                    className={`border border-primary rounded-full px-4 py-1.5 ${isJoining ? 'bg-primary/10 opacity-60' : 'bg-white'}`}
                  >
                    {isJoining ? (
                      <ActivityIndicator size="small" color={Colors.neutralDark} />
                    ) : (
                      <Text className="text-xs font-bold text-neutral-dark">Join</Text>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
