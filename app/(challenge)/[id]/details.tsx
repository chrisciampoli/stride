import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, Linking, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, Trash2, MapPin, Users, Clock, Award, CheckCircle, Calendar, DollarSign, Trophy, CalendarPlus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useChallengeDetail } from '@/hooks/useChallengeDetail';
import { useJoinChallenge } from '@/hooks/mutations/useJoinChallenge';
import { useJoinPaidChallenge } from '@/hooks/mutations/useJoinPaidChallenge';
import { useDeleteChallenge } from '@/hooks/mutations/useDeleteChallenge';
import { usePrizePool } from '@/hooks/usePrizePool';
import { useShareChallenge } from '@/hooks/useShareChallenge';
import { formatDollars, formatTimeLeft } from '@/lib/format';
import type { Challenge, ChallengeParticipant, PaymentStatus, Profile } from '@/types';

type DetailParticipant = Pick<ChallengeParticipant, 'id' | 'user_id' | 'total_steps'> & {
  payment_status?: PaymentStatus;
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

function formatRegistrationTimeLeft(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diff = start.getTime() - now.getTime();
  if (diff <= 0) return 'Closed';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m`;
  }
  return `${hours}h`;
}

export default function ChallengeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: challenge, isPending: challengeLoading, isError: challengeError, refetch } = useChallengeDetail(id);
  const joinChallenge = useJoinChallenge();
  const joinPaidChallenge = useJoinPaidChallenge();
  const deleteChallenge = useDeleteChallenge();
  const { data: prizePool } = usePrizePool(id);
  const { shareChallenge } = useShareChallenge();
  const [refreshing, setRefreshing] = useState(false);
  const isCreator = challenge?.created_by === user?.id;

  const handleDelete = () => {
    if (challenge?.is_paid) {
      Alert.alert(
        'Cancel Challenge?',
        `This challenge has ${paidParticipantCount} paid participant${paidParticipantCount !== 1 ? 's' : ''}. All entry fees will be refunded. This cannot be undone.`,
        [
          { text: 'Keep Challenge', style: 'cancel' },
          {
            text: 'Cancel & Refund All',
            style: 'destructive',
            onPress: () => {
              deleteChallenge.mutate({ challengeId: id, isPaid: true }, {
                onSuccess: () => router.replace('/(tabs)/challenges'),
              });
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'Delete Challenge',
        'This will permanently delete this challenge for all participants. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteChallenge.mutate({ challengeId: id, isPaid: false }, {
                onSuccess: () => router.replace('/(tabs)/challenges'),
              });
            },
          },
        ],
      );
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const participants = (challenge as (Challenge & { challenge_participants: DetailParticipant[] }) | undefined)?.challenge_participants ?? [];
  const isJoined = challenge?.is_paid
    ? participants.some((p) => p.user_id === user?.id && p.payment_status === 'paid')
    : participants.some((p) => p.user_id === user?.id);
  // For display: exclude pending participants from paid challenges
  const displayParticipants = challenge?.is_paid
    ? participants.filter((p) => p.payment_status === 'paid')
    : participants;
  const isCancelled = challenge?.status === 'cancelled';
  const paidParticipantCount = challenge?.is_paid
    ? participants.filter((p) => p.payment_status === 'paid').length
    : 0;
  const myParticipation = participants.find((p) => p.user_id === user?.id);
  const mySteps = myParticipation?.total_steps ?? 0;
  const goalSteps = challenge?.goal_steps ?? 0;
  const progress = goalSteps > 0 ? mySteps / goalSteps : 0;

  const handleJoin = () => {
    if (challenge?.is_paid) {
      joinPaidChallenge.mutate(
        { challengeId: id, challengeName: challenge.name },
        {
          onSuccess: () => router.push(`/(challenge)/${id}/leaderboard`),
          onError: (error) => {
            if (error.message === 'Payment cancelled') return;
            Alert.alert('Could not join', error.message || 'Something went wrong. Please try again.');
          },
        },
      );
    } else {
      joinChallenge.mutate(id, {
        onSuccess: () => router.push(`/(challenge)/${id}/leaderboard`),
      });
    }
  };

  const isJoining = joinChallenge.isPending || joinPaidChallenge.isPending;
  const registrationClosed = challenge?.is_paid && challenge?.start_date
    ? new Date(challenge.start_date).getTime() <= Date.now()
    : false;
  const creatorHasPending = challenge?.is_paid && participants.some((p) => p.user_id === user?.id && p.payment_status === 'pending');
  const creatorNeedsPayment = isCreator && challenge?.is_paid && !isJoined && !creatorHasPending;

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
        rightIcon={
          isCreator && !isCancelled && prizePool?.prizeStatus !== 'distributed' && prizePool?.prizeStatus !== 'distributing'
            ? <Trash2 size={20} color={Colors.neutralDark} />
            : <Share2 size={20} color={Colors.neutralDark} />
        }
        onRightPress={
          isCreator && !isCancelled && prizePool?.prizeStatus !== 'distributed' && prizePool?.prizeStatus !== 'distributing'
            ? handleDelete
            : challenge
              ? () => shareChallenge(challenge)
              : undefined
        }
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
          <View className="flex-row items-center mb-2">
            {challenge?.category && (
              <View className="mr-2">
                <Badge style="lime">{challenge.category}</Badge>
              </View>
            )}
            {challenge?.is_paid && !isCancelled && (
              <Badge style="lime">💰 Prize Pool</Badge>
            )}
            {isCancelled && (
              <Badge style="lime">Cancelled</Badge>
            )}
          </View>
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

        {/* Prize Pool Card (paid challenges only) */}
        {prizePool && prizePool.prizeStatus !== 'refunded' && (
          <View className="px-6 mb-4">
            <Card className="bg-green-50 border-green-200">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                  <DollarSign size={20} color="#078818" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-green-600 uppercase font-bold">Prize Pool</Text>
                  <Text className="text-2xl font-bold text-green-800">
                    {formatDollars(prizePool.prizePoolCents)}
                  </Text>
                </View>
              </View>

              {/* Payout Breakdown */}
              <View className="bg-white/60 rounded-xl p-3 mb-2">
                <Text className="text-[10px] text-green-700 uppercase font-bold mb-2">Payout Breakdown</Text>
                {prizePool.payoutStructure.map((tier) => (
                  <View key={tier.place} className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      <Trophy size={12} color={tier.place === 1 ? '#EAB308' : tier.place === 2 ? '#94A3B8' : '#CD7F32'} />
                      <Text className="text-xs text-green-800 ml-1.5 font-medium">
                        {tier.place === 1 ? '1st' : tier.place === 2 ? '2nd' : `${tier.place}th`} Place
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-green-800">
                      {tier.pct}% · {formatDollars(Math.floor((prizePool.prizePoolCents * 0.95) * tier.pct / 100))}
                    </Text>
                  </View>
                ))}
                <Text className="text-[9px] text-green-600 mt-1">5% platform fee deducted</Text>
              </View>

              {/* Participant Progress */}
              {prizePool.minParticipants > 0 && (
                <View className="flex-row items-center">
                  <Users size={12} color="#078818" />
                  <Text className="text-xs text-green-700 ml-1">
                    {prizePool.paidParticipantCount}/{prizePool.minParticipants} participants
                    {prizePool.paidParticipantCount >= prizePool.minParticipants
                      ? ' ✓ Minimum met'
                      : ' needed to start'}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Registration Banner (upcoming paid challenges) */}
        {challenge?.is_paid && challenge.status === 'upcoming' && !registrationClosed && (
          <View className="mx-6 mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Text className="text-xs text-blue-800">
              Registration is open — the challenge starts after the registration window closes. Invite friends so they can join and pay before it begins!
            </Text>
          </View>
        )}

        {/* Stats Row */}
        <View className="flex-row px-6 gap-3 mb-4">
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <MapPin size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {goalSteps.toLocaleString()}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">Steps</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <Users size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {displayParticipants.length.toLocaleString()}+
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">Joiners</Text>
          </View>
          <View className="flex-1 items-center bg-white border border-border rounded-xl py-3">
            <Clock size={16} color={Colors.neutralMuted} />
            <Text className="text-base font-bold text-neutral-dark mt-1">
              {challenge?.is_paid && challenge.status === 'upcoming'
                ? formatRegistrationTimeLeft(challenge.start_date)
                : challenge ? formatTimeLeft(challenge.end_date) : '--'}
            </Text>
            <Text className="text-[10px] text-muted-text uppercase">
              {challenge?.is_paid && challenge.status === 'upcoming' ? 'Reg. Closes' : 'Time Left'}
            </Text>
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
            {challenge?.is_paid && prizePool && (
              <View className="flex-row items-center mt-3">
                <View className="w-10 h-10 rounded-full bg-green-500/20 items-center justify-center mr-3">
                  <DollarSign size={20} color="#078818" />
                </View>
                <View>
                  <Text className="text-white font-bold text-sm">
                    Win up to {formatDollars(Math.floor(prizePool.prizePoolCents * 0.95))}
                  </Text>
                  <Text className="text-white/50 text-xs">Finish in a prize position</Text>
                </View>
              </View>
            )}
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
          {challenge?.is_paid && (
            <View className="flex-row items-start mb-3">
              <DollarSign size={16} color={Colors.mutedText} />
              <Text className="text-xs text-muted-text ml-2 flex-1">
                Full refund if cancelled before start. No late joins for paid challenges.
              </Text>
            </View>
          )}
          {challenge && (
            <Pressable
              onPress={() => {
                const end = new Date(challenge.end_date);
                const start = new Date(challenge.start_date);
                const title = encodeURIComponent(challenge.name);
                if (Platform.OS === 'ios') {
                  const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                  const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                  Linking.openURL(
                    `calshow:${Math.floor(end.getTime() / 1000)}`,
                  ).catch(() => {
                    Linking.openURL(
                      `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}`,
                    );
                  });
                } else {
                  Linking.openURL(
                    `content://com.android.calendar/time/${end.getTime()}`,
                  ).catch(() => {
                    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    Linking.openURL(
                      `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}`,
                    );
                  });
                }
              }}
              className="flex-row items-center bg-white border border-border rounded-xl px-3 py-2.5 mt-1"
            >
              <CalendarPlus size={16} color={Colors.primary} />
              <Text className="text-xs font-semibold text-primary ml-2">Add End Date to Calendar</Text>
            </Pressable>
          )}
        </View>

        {/* Friends Participating */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-bold text-neutral-dark mb-3">
            Friends Participating
          </Text>
          <View className="flex-row items-center">
            <AvatarGroup
              uris={displayParticipants.slice(0, 5).map((p) => p.profile?.avatar_url ?? null)}
              size="sm"
              max={4}
            />
            <Text className="text-xs text-muted-text ml-2">
              {displayParticipants.length > 0
                ? `${displayParticipants.length} friends already joined`
                : 'Be the first to join!'}
            </Text>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Fixed Bottom CTA */}
      {isCancelled && (
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Text className="text-sm font-medium text-muted-text text-center py-3">
            This challenge has been cancelled
          </Text>
        </View>
      )}
      {!isCancelled && !isJoined && !registrationClosed && !creatorNeedsPayment && (
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleJoin}
            disabled={isJoining}
          >
            {isJoining
              ? 'Processing...'
              : challenge?.is_paid
                ? `Join for ${formatDollars(challenge.entry_fee_cents)}`
                : 'Join Challenge'}
          </Button>
          {challenge?.is_paid && (
            <Text className="text-[10px] text-muted-text text-center mt-2">
              Full refund if cancelled before start date
            </Text>
          )}
        </View>
      )}
      {!isCancelled && creatorNeedsPayment && !registrationClosed && (
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? 'Processing...' : `Complete Your Payment · ${formatDollars(challenge?.entry_fee_cents ?? 0)}`}
          </Button>
          <Text className="text-[10px] text-muted-text text-center mt-2">
            Pay to activate your challenge
          </Text>
        </View>
      )}
      {!isCancelled && !isJoined && registrationClosed && !creatorNeedsPayment && (
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Text className="text-sm font-medium text-muted-text text-center py-3">
            Registration closed
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
