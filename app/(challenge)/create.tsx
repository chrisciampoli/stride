import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { GoalType, PayoutTier } from '@/types';
import { useChallengeFormStore } from '@/stores/challengeFormStore';
import { useFriendsList } from '@/hooks/useFriends';
import { useCreateChallenge } from '@/hooks/mutations/useCreateChallenge';
import { useJoinPaidChallenge } from '@/hooks/mutations/useJoinPaidChallenge';
import { useToastStore } from '@/stores/toastStore';
import { formatDollars } from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { DurationPicker } from '@/components/ui/DurationPicker';
import { TabSelector } from '@/components/ui/TabSelector';
import { SearchBar } from '@/components/ui/SearchBar';
import { FriendInviteRow } from '@/components/ui/FriendInviteRow';
import { Badge } from '@/components/ui/Badge';

const PRESET_FEES = [100, 500, 1000, 2500]; // $1, $5, $10, $25

const PAYOUT_PRESETS: { label: string; tiers: PayoutTier[] }[] = [
  { label: 'Winner Takes All', tiers: [{ place: 1, pct: 100 }] },
  { label: 'Top 2 Split', tiers: [{ place: 1, pct: 70 }, { place: 2, pct: 30 }] },
  { label: 'Top 3 Split', tiers: [{ place: 1, pct: 60 }, { place: 2, pct: 25 }, { place: 3, pct: 15 }] },
];

export default function CreateChallengeScreen() {
  const router = useRouter();
  const {
    name, goalType, goalSteps, durationDays, invitedFriends, isCommunity,
    isPaid, entryFeeCents, payoutStructure, minParticipants,
    setName, setGoalType, setGoalSteps, setDurationDays, toggleFriend, setIsCommunity,
    setIsPaid, setEntryFeeCents, setPayoutStructure, setMinParticipants, reset,
  } = useChallengeFormStore();
  const [friendSearch, setFriendSearch] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [customFee, setCustomFee] = useState('');
  const [showReview, setShowReview] = useState(false);
  const { data: friends = [] } = useFriendsList(friendSearch || undefined);
  const createChallenge = useCreateChallenge();
  const joinPaidChallenge = useJoinPaidChallenge();
  const showToast = useToastStore((s) => s.show);
  const isSubmitting = useRef(false);

  const canCreate = !!name && goalSteps > 0 && durationDays > 0
    && (!isPaid || entryFeeCents > 0);

  const handleCreate = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      const challenge = await createChallenge.mutateAsync({
        name,
        goalSteps,
        goalType,
        durationDays,
        invitedFriends,
        isCommunity,
        isPaid,
        entryFeeCents: isPaid ? entryFeeCents : undefined,
        payoutStructure: isPaid ? payoutStructure : undefined,
        minParticipants: isPaid ? Math.max(minParticipants || 2, 2) : undefined,
      });

      if (isPaid) {
        try {
          await joinPaidChallenge.mutateAsync({
            challengeId: challenge.id,
            challengeName: challenge.name,
          });
          showToast('Challenge created! Payment confirmed.', 'success');
          reset();
          router.back();
        } catch (e) {
          const msg = (e as Error).message;
          if (msg === 'Payment cancelled') {
            showToast('Complete your payment to activate the challenge', 'info');
          } else {
            Alert.alert('Payment Failed', msg || 'Please try again from the challenge page.');
          }
          reset();
          router.replace(`/(challenge)/${challenge.id}/details`);
        }
      } else {
        showToast('Challenge created!', 'success');
        reset();
        router.back();
      }
    } catch {
      Alert.alert('Error', 'Could not create challenge. Please try again.');
    } finally {
      isSubmitting.current = false;
    }
  };

  const selectedPayoutIndex = PAYOUT_PRESETS.findIndex(
    (p) => JSON.stringify(p.tiers) === JSON.stringify(payoutStructure),
  );

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="New Challenge" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4">
            {/* Challenge Name */}
            <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
              Challenge Name
            </Text>
            <TextInput
              className="h-14 bg-white border border-border rounded-xl px-4 text-base text-neutral-dark mb-6"
              placeholder="e.g., Summer Sprint"
              placeholderTextColor={Colors.mutedText}
              value={name}
              onChangeText={setName}
            />

            {/* Goal Type */}
            <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
              Set Your Goal
            </Text>
            <View className="mb-4">
              <TabSelector
                variant="pill"
                tabs={[
                  { key: 'total_steps', label: 'Total Steps' },
                  { key: 'daily_average', label: 'Daily Average' },
                ]}
                activeKey={goalType}
                onTabChange={(key) => setGoalType(key as GoalType)}
              />
            </View>
            <View className="flex-row items-center mb-6">
              <Text className="text-3xl mr-2">🚶</Text>
              <TextInput
                className="text-3xl font-bold text-neutral-dark flex-1"
                value={goalSteps.toString()}
                onChangeText={(t) => setGoalSteps(parseInt(t) || 0)}
                keyboardType="numeric"
              />
              <Text className="text-sm text-muted-text uppercase">Steps</Text>
            </View>

            {/* Duration */}
            <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
              Duration
            </Text>
            <View className="mb-6">
              <DurationPicker
                options={[
                  { label: '3 Days', value: 3 },
                  { label: '1 Week', value: 7 },
                  { label: '2 Weeks', value: 14 },
                  { label: '4 Weeks', value: 28 },
                  { label: 'Custom', value: -1 },
                ]}
                selected={isCustomDuration ? -1 : durationDays}
                onSelect={(val) => {
                  if (val === -1) {
                    setIsCustomDuration(true);
                    setCustomDays('');
                    setDurationDays(0);
                  } else {
                    setIsCustomDuration(false);
                    setDurationDays(val);
                  }
                }}
              />
              {isCustomDuration && (
                <View className="flex-row items-center mt-3">
                  <TextInput
                    className="h-12 bg-white border border-border rounded-xl px-4 text-base text-neutral-dark flex-1"
                    placeholder="Number of days (1–365)"
                    placeholderTextColor={Colors.mutedText}
                    keyboardType="numeric"
                    value={customDays}
                    onChangeText={(text) => {
                      const digits = text.replace(/[^0-9]/g, '');
                      setCustomDays(digits);
                      const n = parseInt(digits, 10);
                      setDurationDays(n >= 1 && n <= 365 ? n : 0);
                    }}
                  />
                  <Text className="text-sm text-muted-text ml-3">days</Text>
                </View>
              )}
            </View>

            {/* Visibility */}
            <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
              Visibility
            </Text>
            <View className="mb-6">
              <TabSelector
                variant="pill"
                tabs={[
                  { key: 'private', label: 'Private' },
                  { key: 'public', label: 'Public' },
                ]}
                activeKey={isCommunity ? 'public' : 'private'}
                onTabChange={(key) => setIsCommunity(key === 'public')}
              />
            </View>

            {/* Prize Pool Toggle */}
            <View className="flex-row items-center justify-between bg-white border border-border rounded-xl px-4 py-3 mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                  <DollarSign size={16} color="#078818" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-dark">Add a Prize Pool</Text>
                  <Text className="text-[10px] text-muted-text">
                    Put real money on the line. The winner takes the pot.
                  </Text>
                </View>
              </View>
              <Switch
                value={isPaid}
                onValueChange={setIsPaid}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            {/* Prize Pool Configuration (only when enabled) */}
            {isPaid && (
              <View className="mb-6">
                {/* Entry Fee */}
                <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
                  Entry Fee
                </Text>
                <View className="flex-row gap-2 mb-2">
                  {PRESET_FEES.map((fee) => (
                    <Pressable
                      key={fee}
                      onPress={() => { setEntryFeeCents(fee); setCustomFee(''); }}
                      className={`flex-1 items-center py-2.5 rounded-xl border ${
                        entryFeeCents === fee && !customFee
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-bold ${
                        entryFeeCents === fee && !customFee ? 'text-primary' : 'text-neutral-dark'
                      }`}>
                        {formatDollars(fee)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-sm text-muted-text mr-2">Custom:</Text>
                  <TextInput
                    className="h-10 bg-white border border-border rounded-xl px-3 text-sm text-neutral-dark flex-1"
                    placeholder="$1 – $100"
                    placeholderTextColor={Colors.mutedText}
                    keyboardType="numeric"
                    value={customFee}
                    onChangeText={(text) => {
                      const digits = text.replace(/[^0-9.]/g, '');
                      setCustomFee(digits);
                      const dollars = parseFloat(digits);
                      if (dollars >= 1 && dollars <= 100) {
                        setEntryFeeCents(Math.round(dollars * 100));
                      }
                    }}
                  />
                </View>

                {/* Payout Structure */}
                <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-4 mb-2">
                  Payout Structure
                </Text>
                {PAYOUT_PRESETS.map((preset, index) => (
                  <Pressable
                    key={preset.label}
                    onPress={() => setPayoutStructure(preset.tiers)}
                    className={`flex-row items-center px-4 py-3 rounded-xl border mb-2 ${
                      selectedPayoutIndex === index
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-white'
                    }`}
                  >
                    <View className="flex-1">
                      <Text className={`text-sm font-bold ${
                        selectedPayoutIndex === index ? 'text-primary' : 'text-neutral-dark'
                      }`}>
                        {preset.label}
                      </Text>
                      <Text className="text-[10px] text-muted-text">
                        {preset.tiers.map((t) => `${ordinalLabel(t.place)}: ${t.pct}%`).join(' · ')}
                      </Text>
                    </View>
                    <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      selectedPayoutIndex === index ? 'border-primary' : 'border-border'
                    }`}>
                      {selectedPayoutIndex === index && (
                        <View className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </View>
                  </Pressable>
                ))}

                {/* Min Participants */}
                <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-4 mb-2">
                  Minimum Participants
                </Text>
                <Text className="text-[10px] text-muted-text mb-2">
                  Minimum 2 participants required for prize pool challenges. Auto-refund if not met by start date.
                </Text>
                <TextInput
                  className="h-12 bg-white border border-border rounded-xl px-4 text-base text-neutral-dark"
                  placeholder="2 (minimum for prize pool)"
                  placeholderTextColor={Colors.mutedText}
                  keyboardType="numeric"
                  value={minParticipants > 0 ? minParticipants.toString() : ''}
                  onChangeText={(text) => {
                    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    setMinParticipants(isNaN(n) ? 2 : Math.max(n, 2));
                  }}
                />

                {/* 5% Platform Fee Notice */}
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <Text className="text-xs text-amber-800">
                    A 5% platform fee is deducted from the prize pool before distribution. Creators compete and can win.
                  </Text>
                </View>
              </View>
            )}

            {/* Invite Friends */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-muted-text uppercase tracking-wider">
                Invite Friends
              </Text>
              {invitedFriends.length > 0 && (
                <Badge style="lime">{invitedFriends.length} Selected</Badge>
              )}
            </View>
            <View className="mb-3">
              <SearchBar
                placeholder="Search friends by username"
                value={friendSearch}
                onChangeText={setFriendSearch}
              />
            </View>
            {friends.map((friend) => (
              <FriendInviteRow
                key={friend.id}
                name={friend.profile.full_name ?? 'Unknown'}
                handle={`@${(friend.profile.full_name ?? '').toLowerCase().replace(/\s/g, '_')}`}
                avatarUri={friend.profile.avatar_url ?? undefined}
                selected={invitedFriends.includes(friend.id)}
                onToggle={() => toggleFriend(friend.id)}
              />
            ))}
            {friends.length === 0 && (
              <Text className="text-xs text-muted-text text-center py-4">
                {friendSearch ? 'No friends found' : 'Add friends to invite them'}
              </Text>
            )}
          </View>

          <View className="h-24" />
        </ScrollView>

        {/* Review Step Overlay */}
        {showReview && (
          <View className="absolute inset-0 bg-background-light">
            <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-bold text-neutral-dark mb-4">Review Challenge</Text>

              <View className="bg-white rounded-xl border border-border p-4 mb-3">
                <Text className="text-[10px] text-muted-text uppercase font-bold mb-1">Name</Text>
                <Text className="text-base font-bold text-neutral-dark">{name}</Text>
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1 bg-white rounded-xl border border-border p-4">
                  <Text className="text-[10px] text-muted-text uppercase font-bold mb-1">Goal</Text>
                  <Text className="text-base font-bold text-neutral-dark">
                    {goalSteps.toLocaleString()}
                  </Text>
                  <Text className="text-[10px] text-muted-text">
                    {goalType === 'total_steps' ? 'Total Steps' : 'Daily Avg'}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-xl border border-border p-4">
                  <Text className="text-[10px] text-muted-text uppercase font-bold mb-1">Duration</Text>
                  <Text className="text-base font-bold text-neutral-dark">{durationDays}</Text>
                  <Text className="text-[10px] text-muted-text">Days</Text>
                </View>
              </View>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1 bg-white rounded-xl border border-border p-4">
                  <Text className="text-[10px] text-muted-text uppercase font-bold mb-1">Visibility</Text>
                  <Text className="text-sm font-bold text-neutral-dark">
                    {isCommunity ? 'Public' : 'Private'}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-xl border border-border p-4">
                  <Text className="text-[10px] text-muted-text uppercase font-bold mb-1">Invited</Text>
                  <Text className="text-sm font-bold text-neutral-dark">
                    {invitedFriends.length} friend{invitedFriends.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {isPaid && (
                <View className="bg-green-50 rounded-xl border border-green-200 p-4 mb-3">
                  <Text className="text-[10px] text-green-600 uppercase font-bold mb-2">Prize Pool</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-green-800">Entry Fee</Text>
                    <Text className="text-xs font-bold text-green-800">{formatDollars(entryFeeCents)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-green-800">Payout</Text>
                    <Text className="text-xs font-bold text-green-800">
                      {PAYOUT_PRESETS.find((p) => JSON.stringify(p.tiers) === JSON.stringify(payoutStructure))?.label ?? 'Custom'}
                    </Text>
                  </View>
                  {minParticipants > 0 && (
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-green-800">Min Participants</Text>
                      <Text className="text-xs font-bold text-green-800">{minParticipants}</Text>
                    </View>
                  )}
                  <View className="mt-2 pt-2 border-t border-green-200">
                    <Text className="text-[10px] text-green-700">
                      You'll pay {formatDollars(entryFeeCents)} after creating. 48h registration window for friends to join.
                    </Text>
                  </View>
                </View>
              )}

              <View className="h-24" />
            </ScrollView>

            <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleCreate}
                disabled={createChallenge.isPending || joinPaidChallenge.isPending}
              >
                {createChallenge.isPending || joinPaidChallenge.isPending
                  ? 'Processing...'
                  : isPaid
                    ? `Confirm & Pay ${formatDollars(entryFeeCents)}`
                    : 'Confirm & Create'}
              </Button>
              <Pressable onPress={() => setShowReview(false)} className="items-center mt-3">
                <Text className="text-sm font-medium text-muted-text">Go Back & Edit</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Fixed Bottom Button */}
        {!showReview && (
          <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setShowReview(true)}
              disabled={!canCreate}
            >
              {isPaid
                ? `Review · ${formatDollars(entryFeeCents)} Entry`
                : 'Review Challenge'}
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ordinalLabel(place: number): string {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}
