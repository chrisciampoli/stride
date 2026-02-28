import React from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, TrendingUp, Calendar, DollarSign, Share2, ChevronRight, Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useChallengeDetail } from '@/hooks/useChallengeDetail';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePrizePool } from '@/hooks/usePrizePool';
import { ordinal, formatDollars } from '@/lib/format';
import type { ChallengeParticipant, Profile } from '@/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type LeaderboardParticipant = ChallengeParticipant & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '\u{1F3C6}'; // trophy
    case 2:
      return '\u{1F948}'; // 2nd place medal
    case 3:
      return '\u{1F949}'; // 3rd place medal
    default:
      return '\u{1F3C5}'; // sports medal
  }
}

function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return '#FFD700';
    case 2:
      return '#C0C0C0';
    case 3:
      return '#CD7F32';
    default:
      return Colors.mutedText;
  }
}

export default function ChallengeResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    data: challenge,
    isPending: challengeLoading,
    isError: challengeError,
    refetch: refetchChallenge,
  } = useChallengeDetail(id);
  const {
    data: participants = [],
    isPending: participantsLoading,
    isError: participantsError,
    refetch: refetchParticipants,
  } = useLeaderboard(id);
  const { data: prizePool } = usePrizePool(id);

  const isLoading = challengeLoading || participantsLoading;
  const isError = challengeError || participantsError;

  const handleRefetch = async () => {
    await Promise.all([refetchChallenge(), refetchParticipants()]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Results" />
        <LoadingState message="Loading results..." />
      </SafeAreaView>
    );
  }

  if (isError || !challenge) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Results" />
        <ErrorState message="Could not load challenge results" onRetry={handleRefetch} />
      </SafeAreaView>
    );
  }

  const typedParticipants = participants as LeaderboardParticipant[];
  const myEntry = typedParticipants.find((p) => p.user_id === user?.id);
  const myRank = typedParticipants.findIndex((p) => p.user_id === user?.id) + 1;
  const mySteps = myEntry?.total_steps ?? 0;
  const goalSteps = challenge.goal_steps ?? 0;
  const totalParticipants = typedParticipants.length;

  // Calculate duration
  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
  const dailyAverage = durationDays > 0 ? Math.round(mySteps / durationDays) : 0;

  // Prize calculation
  const getPrizeForRank = (rank: number): number | undefined => {
    if (!prizePool) return undefined;
    const tier = prizePool.payoutStructure.find((t) => t.place === rank);
    if (!tier) return undefined;
    return Math.floor((prizePool.prizePoolCents * 0.95) * tier.pct / 100);
  };

  const myPrize = myRank > 0 ? getPrizeForRank(myRank) : undefined;

  const handleShare = async () => {
    const rankText = myRank > 0 ? `I finished ${ordinal(myRank)} place` : 'I participated';
    const stepsText = mySteps > 0 ? ` with ${mySteps.toLocaleString()} steps` : '';
    const prizeText = myPrize ? ` and won ${formatDollars(myPrize)}!` : '!';

    await Share.share({
      message: `${rankText} in the "${challenge.name}" challenge on Stride${stepsText}${prizeText} Join me on Stride to compete in walking challenges!`,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Results" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Celebration Hero */}
        <View className="bg-neutral-dark mx-6 mt-2 rounded-2xl p-6 mb-5 items-center">
          <Text className="text-4xl mb-3">{myRank > 0 ? getRankEmoji(myRank) : '\u{1F3C1}'}</Text>
          <Text className="text-white text-2xl font-bold mb-1 text-center">
            Challenge Complete!
          </Text>
          <Text className="text-white/60 text-sm text-center">
            {challenge.name}
          </Text>
        </View>

        {/* Rank Display */}
        {myRank > 0 ? (
          <View className="mx-6 mb-5 items-center">
            <View
              className="w-28 h-28 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: `${getRankColor(myRank)}20` }}
            >
              <Text className="text-5xl font-bold" style={{ color: getRankColor(myRank) }}>
                {myRank}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-dark">
              {ordinal(myRank)} Place
            </Text>
            <Text className="text-sm text-muted-text mt-1">
              out of {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </Text>
          </View>
        ) : (
          <View className="mx-6 mb-5 items-center">
            <Text className="text-lg font-bold text-neutral-dark">
              You were not ranked in this challenge
            </Text>
          </View>
        )}

        {/* Stats Cards */}
        <View className="flex-row px-6 gap-3 mb-5">
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-4">
            <TrendingUp size={18} color={Colors.primary} />
            <Text className="text-lg font-bold text-neutral-dark mt-2">
              {mySteps.toLocaleString()}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase mt-1">Total Steps</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-4">
            <Calendar size={18} color={Colors.primary} />
            <Text className="text-lg font-bold text-neutral-dark mt-2">
              {dailyAverage.toLocaleString()}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase mt-1">Daily Avg</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-4">
            <Trophy size={18} color={Colors.primary} />
            <Text className="text-lg font-bold text-neutral-dark mt-2">
              {durationDays}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase mt-1">
              {durationDays === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        {/* Goal Completion */}
        <View className="px-6 mb-5">
          <Card>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-text uppercase font-bold mb-1">Goal</Text>
                <Text className="text-base font-bold text-neutral-dark">
                  {goalSteps.toLocaleString()} steps
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-muted-text uppercase font-bold mb-1">Status</Text>
                {mySteps >= goalSteps ? (
                  <Text className="text-base font-bold text-green-700">Completed</Text>
                ) : (
                  <Text className="text-base font-bold text-muted-text">
                    {goalSteps > 0 ? `${Math.round((mySteps / goalSteps) * 100)}%` : '--'}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Prize Info (paid challenges) */}
        {challenge.is_paid && prizePool && (
          <View className="px-6 mb-5">
            <Card className="bg-green-50 border-green-200">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mr-4">
                  <DollarSign size={24} color="#078818" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-green-600 uppercase font-bold mb-1">
                    {myPrize ? 'Prize Won' : 'Prize Pool'}
                  </Text>
                  {myPrize ? (
                    <Text className="text-2xl font-bold text-green-800">
                      {formatDollars(myPrize)}
                    </Text>
                  ) : (
                    <Text className="text-base font-medium text-green-700">
                      No prize for {myRank > 0 ? `${ordinal(myRank)} place` : 'your position'}
                    </Text>
                  )}
                </View>
              </View>
              {myPrize ? (
                <Text className="text-xs text-green-600 mt-2">
                  Prize has been added to your wallet
                </Text>
              ) : (
                <Text className="text-xs text-green-600 mt-2">
                  Total pool: {formatDollars(prizePool.prizePoolCents)} (top {prizePool.payoutStructure.length} positions paid)
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* Share CTA */}
        <View className="px-6 mb-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleShare}
            iconLeft={<Share2 size={18} color={Colors.neutralDark} />}
          >
            Share Results
          </Button>
        </View>

        {/* Action Buttons */}
        <View className="px-6 mb-4">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onPress={() => router.push(`/(challenge)/${id}/leaderboard` as never)}
            iconRight={<ChevronRight size={16} color={Colors.neutralDark} />}
          >
            View Leaderboard
          </Button>
        </View>

        <View className="px-6 mb-8">
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.push('/(challenge)/discover' as never)}
            iconRight={<Search size={16} color={Colors.neutralDark} />}
          >
            Find Next Challenge
          </Button>
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
