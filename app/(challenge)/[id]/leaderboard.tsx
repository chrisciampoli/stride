import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Info } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useChallengeDetail } from '@/hooks/useChallengeDetail';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { ChallengeParticipant, Profile } from '@/types';

type LeaderboardParticipant = ChallengeParticipant & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
import { Badge } from '@/components/ui/Badge';
import { FloatingRankFab } from '@/components/ui/FloatingRankFab';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

function formatTimeLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: challenge, isPending: challengeLoading, refetch: refetchChallenge } = useChallengeDetail(id);
  const { data: participants = [], isPending: participantsLoading, isError: participantsError, refetch } = useLeaderboard(id);
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

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title={challenge?.name ?? 'Challenge'}
        rightIcon={<Info size={20} color={Colors.neutralDark} />}
      />
      {challenge && (
        <Text className="text-xs text-muted-text text-center -mt-1 mb-2">
          ⏱ {formatTimeLeft(challenge.end_date)}
        </Text>
      )}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero Progress Card */}
        <View className="px-6 mb-4">
          <Card variant="dark" className="p-5">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-white/60 uppercase font-bold tracking-wider">
                Your Progress
              </Text>
              <View className="bg-primary rounded-lg px-2.5 py-1">
                <Text className="text-xs font-bold text-neutral-dark">
                  {myRank > 0 ? `${myRank}th` : '--'}
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
                  ⚡ You're only {stepsToNext.toLocaleString()} steps away from {myRank - 1}
                  {myRank - 1 === 1 ? 'st' : myRank - 1 === 2 ? 'nd' : myRank - 1 === 3 ? 'rd' : 'th'} place!
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
            />
          ))}
        </View>

        <View className="h-24" />
      </ScrollView>

      {myRank > 0 && (
        <FloatingRankFab
          rank={myRank}
          steps={`${(mySteps / 1000).toFixed(1)}k steps`}
        />
      )}
    </SafeAreaView>
  );
}
