import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, MapPin, Users, Clock, Award, CheckCircle, Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useChallengeDetail } from '@/hooks/useChallengeDetail';
import { useJoinChallenge } from '@/hooks/mutations/useJoinChallenge';
import type { Challenge, ChallengeParticipant, Profile } from '@/types';

type DetailParticipant = Pick<ChallengeParticipant, 'id' | 'user_id' | 'total_steps'> & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
};
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

function formatTimeLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d`;
}

export default function ChallengeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: challenge, isPending: challengeLoading, isError: challengeError, refetch } = useChallengeDetail(id);
  const joinChallenge = useJoinChallenge();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const participants = (challenge as (Challenge & { challenge_participants: DetailParticipant[] }) | undefined)?.challenge_participants ?? [];
  const isJoined = participants.some((p) => p.user_id === user?.id);
  const myParticipation = participants.find((p) => p.user_id === user?.id);
  const mySteps = myParticipation?.total_steps ?? 0;
  const goalSteps = challenge?.goal_steps ?? 0;
  const progress = goalSteps > 0 ? mySteps / goalSteps : 0;

  const handleJoin = () => {
    joinChallenge.mutate(id, {
      onSuccess: () => router.push(`/(challenge)/${id}/leaderboard`),
    });
  };

  if (challengeLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Challenge" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (challengeError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Challenge" />
        <ErrorState message="Could not load challenge" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title={challenge?.name ?? 'Challenge'}
        rightIcon={<Share2 size={20} color={Colors.neutralDark} />}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero */}
        <View className="bg-neutral-dark mx-6 rounded-2xl p-5 mb-4">
          {challenge?.category && (
            <View className="self-start mb-2">
              <Badge style="lime">{challenge.category}</Badge>
            </View>
          )}
          <Text className="text-white text-xl font-bold mb-1">
            {challenge?.name ?? 'Challenge'}
          </Text>
          <View className="flex-row items-center">
            <MapPin size={14} color="#ffffff80" />
            <Text className="text-white/50 text-xs ml-1">
              {challenge?.description ?? 'A community challenge'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row px-6 gap-3 mb-4">
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <MapPin size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {(goalSteps / 1000).toFixed(0)}km
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">Distance</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <Users size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {participants.length.toLocaleString()}+
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">Joiners</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <Clock size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {challenge ? formatTimeLeft(challenge.end_date) : '--'}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">Time Left</Text>
          </View>
        </View>

        {/* Your Progress */}
        <View className="px-6 mb-4">
          <Card>
            <Text className="text-sm font-bold text-neutral-dark mb-2">
              Your Progress
            </Text>
            <ProgressBar progress={progress} height="standard" />
            <Text className="text-xs text-muted-text mt-2">
              {isJoined
                ? `${mySteps.toLocaleString()} / ${goalSteps.toLocaleString()} steps`
                : "You haven't started yet"}
            </Text>
          </Card>
        </View>

        {/* Challenge Rewards */}
        <View className="px-6 mb-4">
          <Card variant="dark">
            <Text className="text-xs text-white/60 uppercase font-bold tracking-wider mb-2">
              Challenge Rewards
            </Text>
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Award size={20} color={Colors.primary} />
              </View>
              <View>
                <Text className="text-white font-bold text-sm">{challenge?.name ?? 'Challenge'} Badge</Text>
                <Text className="text-white/50 text-xs">Complete the challenge</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Rules */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-bold text-neutral-dark mb-3">
            Rules & Guidelines
          </Text>
          <View className="flex-row items-start mb-3">
            <CheckCircle size={16} color={Colors.mutedText} />
            <Text className="text-xs text-muted-text ml-2 flex-1">
              Auto Sync Only — Connect your Apple Health or Google Fit
            </Text>
          </View>
          <View className="flex-row items-start mb-3">
            <Calendar size={16} color={Colors.mutedText} />
            <Text className="text-xs text-muted-text ml-2 flex-1">
              Challenge Period — {challenge?.duration_days ?? 0} days from start date
            </Text>
          </View>
        </View>

        {/* Friends Participating */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-bold text-neutral-dark mb-3">
            Friends Participating
          </Text>
          <View className="flex-row items-center">
            <AvatarGroup
              uris={participants.slice(0, 5).map((p) => p.profile?.avatar_url ?? null)}
              size="sm"
              max={4}
            />
            <Text className="text-xs text-muted-text ml-2">
              {participants.length > 0
                ? `${participants.length} friends already joined`
                : 'Be the first to join!'}
            </Text>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Fixed Bottom CTA */}
      {!isJoined && (
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleJoin}
            disabled={joinChallenge.isPending}
          >
            Join Challenge
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
