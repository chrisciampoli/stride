import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useActiveChallenges, useCompletedChallenges } from '@/hooks/useChallenges';
import { useFeatured } from '@/hooks/useDiscoverChallenges';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { TabSelector } from '@/components/ui/TabSelector';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { Button } from '@/components/ui/Button';
import { ChallengeCard } from '@/components/ui/ChallengeCard';
import { CommunityChallengeCard } from '@/components/ui/CommunityChallengeCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

function formatTimeLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} days`;
  return `${hours}h`;
}

export default function ChallengesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { data: activeChallenges = [], isPending: activeLoading, isError: activeError, refetch: refetchActive } = useActiveChallenges();
  const { data: completedChallenges = [], isPending: completedLoading, refetch: refetchCompleted } = useCompletedChallenges();
  const { data: featured = [], error: featuredError } = useFeatured();

  const isLoading = activeLoading && completedLoading;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchActive(), refetchCompleted()]);
    setRefreshing(false);
  }, [refetchActive, refetchCompleted]);

  const rawChallenges = activeTab === 'active' ? activeChallenges : completedChallenges;

  // Derive categories from challenges
  const categories = useMemo(() => {
    const cats = new Set<string>();
    [...activeChallenges, ...completedChallenges].forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [activeChallenges, completedChallenges]);

  const challenges = selectedCategory === 'All'
    ? rawChallenges
    : rawChallenges.filter((c) => c.category === selectedCategory);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="My Challenges" showBack={false} />
        <LoadingState message="Loading challenges..." />
      </SafeAreaView>
    );
  }

  if (activeError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="My Challenges" showBack={false} />
        <ErrorState
          message="Could not load challenges"
          onRetry={() => { refetchActive(); refetchCompleted(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="My Challenges"
        showBack={false}
        rightIcon={<Search size={20} color={Colors.neutralDark} />}
        onRightPress={() => router.push('/(challenge)/discover')}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Tabs */}
        <View className="px-6 pt-4 pb-2">
          <TabSelector
            tabs={[
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
            ]}
            activeKey={activeTab}
            onTabChange={setActiveTab}
          />
        </View>

        {/* Category Filter */}
        {categories.length > 1 && (
          <View className="mb-3">
            <CategoryPills
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        )}

        {/* New Challenge Button */}
        <View className="px-6 mb-4">
          <Button
            variant="primary"
            size="md"
            fullWidth
            iconLeft={<Plus size={18} color={Colors.neutralDark} />}
            onPress={() => router.push('/(challenge)/create')}
          >
            New Challenge
          </Button>
        </View>

        {/* Challenge Cards */}
        <View className="px-6">
          {challenges.length === 0 ? (
            <View className="py-8 items-center gap-3">
              <Text className="text-muted-text text-sm">
                {activeTab === 'active'
                  ? 'No active challenges yet.'
                  : 'No completed challenges yet.'}
              </Text>
              {activeTab === 'active' && (
                <View className="flex-row gap-2">
                  <Button variant="primary" size="sm" onPress={() => router.push('/(challenge)/create')}>
                    Create Challenge
                  </Button>
                  <Button variant="secondary" size="sm" onPress={() => router.push('/(challenge)/discover')}>
                    Discover
                  </Button>
                </View>
              )}
            </View>
          ) : (
            challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                name={challenge.name}
                status={challenge.status === 'upcoming' ? 'STARTS SOON' : undefined}
                currentSteps={challenge.challenge_participants?.[0]?.total_steps ?? 0}
                goalSteps={challenge.goal_steps}
                participantCount={challenge.participantCount}
                timeLeft={formatTimeLeft(challenge.end_date)}
                onPress={() =>
                  router.push(`/(challenge)/${challenge.id}/leaderboard`)
                }
              />
            ))
          )}
        </View>

        {/* Discover Community Challenges */}
        {featured.length > 0 && (
          <View className="mt-6 mb-8">
            <Pressable
              className="flex-row items-center justify-between px-6 mb-3"
              onPress={() => router.push('/(challenge)/discover')}
            >
              <Text className="text-lg font-bold text-neutral-dark">
                Discover Community Challenges
              </Text>
              <Text className="text-xs font-bold text-muted-text uppercase">See All</Text>
            </Pressable>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              {featured.map((c) => (
                <CommunityChallengeCard
                  key={c.id}
                  title={c.name}
                  badge={c.category ?? undefined}
                  participantCount={c.challenge_participants?.[0]?.count ?? 0}
                  onPress={() => router.push(`/(challenge)/${c.id}/details`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {featured.length === 0 && featuredError && (
          <Text className="text-xs text-muted-text text-center px-6 py-4">
            Could not load community challenges
          </Text>
        )}

        {/* Bottom spacer for absolute-positioned tab bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
