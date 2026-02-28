import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Info, Clock, Share2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useChallengeDetail } from '@/hooks/useChallengeDetail';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePrizePool } from '@/hooks/usePrizePool';
import { useShareChallenge } from '@/hooks/useShareChallenge';
import type { ChallengeParticipant, Profile } from '@/types';
import { ordinal, formatDollars, formatTimeLeft } from '@/lib/format';

type LeaderboardParticipant = ChallengeParticipant & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
import { FloatingRankFab } from '@/components/ui/FloatingRankFab';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: challenge, isPending: challengeLoading, refetch: refetchChallenge } = useChallengeDetail(id);
  const { data: participants = [], isPending: participantsLoading, isError: participantsError, refetch } = useLeaderboard(id);
  const { data: prizePool } = usePrizePool(id);
  const { shareRank } = useShareChallenge();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchChallenge()]);
    setRefreshing(false);
  }, [refetch, refetchChallenge]);

  if (challengeLoading && participantsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Challenge" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (participantsError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Challenge" />
        <ErrorState message="Could not load leaderboard" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const typedParticipants = participants as LeaderboardParticipant[];
  const myEntry = typedParticipants.find((p) => p.user_id === user?.id);
  const myRank = typedParticipants.findIndex((p) => p.user_id === user?.id) + 1;
  const mySteps = myEntry?.total_steps ?? 0;
  const goalSteps = challenge?.goal_steps ?? 50000;
  const progress = goalSteps > 0 ? mySteps / goalSteps : 0;
  const percentage = Math.round(progress * 100);

  // Calculate steps to next rank
  const nextRankEntry = myRank > 1 ? typedParticipants[myRank - 2] : null;
  const stepsToNext = nextRankEntry
    ? nextRankEntry.total_steps - mySteps
    : 0;

  const maxSteps = typedParticipants.length > 0 ? typedParticipants[0].total_steps : 1;

  // Calculate prize amounts per position
  const getPrizeForRank = (rank: number): number | undefined => {
    if (!prizePool) return undefined;
    const tier = prizePool.payoutStructure.find((t) => t.place === rank);
    if (!tier) return undefined;
    return Math.floor((prizePool.prizePoolCents * 0.95) * tier.pct / 100);
  };

  const isTiebreaker = challenge?.status === 'tiebreaker';
  const tiebreakerEnd = prizePool?.tiebreakerEndDate;

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title={challenge?.name ?? 'Challenge'}
        rightIcon={<Info size={20} color={Colors.neutralDark} />}
        onRightPress={() => router.push(`/(challenge)/${id}/details`)}
      />
      {challenge && (
        <Text className="text-xs text-muted-text text-center -mt-1 mb-2">
          ⏱ {formatTimeLeft(isTiebreaker && tiebreakerEnd ? tiebreakerEnd : challenge.end_date)}
        </Text>
      )}

      {/* Tiebreaker Banner */}
      {isTiebreaker && (
        <View className="mx-6 mb-3 bg-amber-50 border border-amber-300 rounded-xl p-3 flex-row items-center">
          <Clock size={16} color="#B45309" />
          <View className="ml-2 flex-1">
            <Text className="text-xs font-bold text-amber-800">Tiebreaker! 🏃</Text>
            <Text className="text-[10px] text-amber-700">
              Top positions are tied. 1 extra day to break it!
              {tiebreakerEnd && ` Ends ${new Date(tiebreakerEnd).toLocaleDateString()}`}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Prize Pool Banner (if paid) */}
        {prizePool && (
          <View className="px-6 mb-4">
            <View className="bg-green-50 border border-green-200 rounded-xl p-3 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] text-green-600 uppercase font-bold">Prize Pool</Text>
                <Text className="text-lg font-bold text-green-800">{formatDollars(prizePool.prizePoolCents)}</Text>
              </View>
              <View className="items-end">
                {prizePool.payoutStructure.map((tier) => (
                  <Text key={tier.place} className="text-[10px] text-green-700">
                    {ordinal(tier.place)}: {formatDollars(Math.floor((prizePool.prizePoolCents * 0.95) * tier.pct / 100))}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Hero Progress Card */}
        <View className="px-6 mb-4">
          <Card variant="dark" className="p-5">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-white/60 uppercase font-bold tracking-wider">
                Your Progress
              </Text>
              <View className="bg-primary rounded-lg px-2.5 py-1">
                <Text className="text-xs font-bold text-neutral-dark">
                  {myRank > 0 ? ordinal(myRank) : '--'}
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-bold text-white mb-1">
              {mySteps.toLocaleString()}
              <Text className="text-base text-white/50">
                {' '}/ {goalSteps.toLocaleString()} steps
              </Text>
            </Text>
            <Text className="text-xs text-white/50 mb-3">
              {percentage}% Completed · {Math.max(goalSteps - mySteps, 0).toLocaleString()} steps to goal
            </Text>
            <ProgressBar progress={progress} height="standard" inverted />
            {stepsToNext > 0 && (
              <View className="mt-3 bg-primary/10 rounded-full px-3 py-2 self-start">
                <Text className="text-xs text-primary font-medium">
                  ⚡ You're only {stepsToNext.toLocaleString()} steps away from {ordinal(myRank - 1)} place!
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Leaderboard */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-neutral-dark">Leaderboard</Text>
            <Text className="text-xs text-muted-text">
              {participants.length} participants
            </Text>
          </View>
          {typedParticipants.map((p, index) => (
            <LeaderboardRow
              key={p.id}
              rank={index + 1}
              name={p.profile?.full_name ?? 'Unknown'}
              steps={p.total_steps}
              maxSteps={maxSteps}
              avatarUri={p.profile?.avatar_url ?? undefined}
              isCurrentUser={p.user_id === user?.id}
              prizeAmount={getPrizeForRank(index + 1)}
              onPress={p.user_id !== user?.id ? () => router.push(`/(social)/friend/${p.user_id}`) : undefined}
            />
          ))}
        </View>

        {/* Share My Rank */}
        {myRank > 0 && challenge && (
          <View className="px-6 mb-4">
            <Pressable
              onPress={() => shareRank(challenge, myRank, mySteps)}
              className="flex-row items-center justify-center bg-primary rounded-xl py-3.5"
              style={{
                shadowColor: '#E85D0A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Share2 size={18} color={Colors.neutralDark} />
              <Text className="text-sm font-bold text-neutral-dark uppercase tracking-wider ml-2">
                Share My Rank
              </Text>
            </Pressable>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      {myRank > 0 && (
        <FloatingRankFab
          rank={myRank}
          steps={`${(mySteps / 1000).toFixed(1)}k steps`}
          prizeAmount={getPrizeForRank(myRank)}
        />
      )}
    </SafeAreaView>
  );
}
