import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import type { GoalType } from '@/types';
import { useChallengeFormStore } from '@/stores/challengeFormStore';
import { useFriendsList } from '@/hooks/useFriends';
import { useCreateChallenge } from '@/hooks/mutations/useCreateChallenge';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { DurationPicker } from '@/components/ui/DurationPicker';
import { TabSelector } from '@/components/ui/TabSelector';
import { SearchBar } from '@/components/ui/SearchBar';
import { FriendInviteRow } from '@/components/ui/FriendInviteRow';
import { Badge } from '@/components/ui/Badge';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const {
    name, goalType, goalSteps, durationDays, invitedFriends, isCommunity,
    setName, setGoalType, setGoalSteps, setDurationDays, toggleFriend, setIsCommunity, reset,
  } = useChallengeFormStore();
  const [friendSearch, setFriendSearch] = useState('');
  const { data: friends = [] } = useFriendsList(friendSearch || undefined);
  const createChallenge = useCreateChallenge();

  const handleCreate = async () => {
    try {
      await createChallenge.mutateAsync({
        name,
        goalSteps,
        goalType,
        durationDays,
        invitedFriends,
        isCommunity,
      });
      reset();
      router.back();
    } catch {
      Alert.alert('Error', 'Could not create challenge. Please try again.');
    }
  };

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
                ]}
                selected={durationDays}
                onSelect={setDurationDays}
              />
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

        {/* Fixed Bottom Button */}
        <View className="px-6 pb-6 pt-2 bg-background-light border-t border-border">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleCreate}
            disabled={!name || goalSteps <= 0 || createChallenge.isPending}
          >
            Create Challenge
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
