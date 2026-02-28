import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Avatar, type AvatarBorder } from './Avatar';
import { ProgressBar } from './ProgressBar';
import { formatDollars } from '@/lib/format';

interface LeaderboardRowProps {
  rank: number;
  name: string;
  steps: number;
  maxSteps: number;
  avatarUri?: string;
  isCurrentUser?: boolean;
  prizeAmount?: number;
  onPress?: () => void;
}

export function LeaderboardRow({
  rank,
  name,
  steps,
  maxSteps,
  avatarUri,
  isCurrentUser = false,
  prizeAmount,
  onPress,
}: LeaderboardRowProps) {
  const getMedalColor = (): AvatarBorder => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'none';
  };

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      className={`flex-row items-center py-3 px-3 rounded-xl mb-2 ${
        isCurrentUser ? 'bg-primary' : 'bg-white'
      }`}
    >
      <Text
        className={`w-6 text-sm font-bold ${
          isCurrentUser ? 'text-neutral-dark' : 'text-muted-text'
        }`}
      >
        {rank}
      </Text>
      <Avatar
        uri={avatarUri}
        initials={name.charAt(0)}
        size="sm"
        border={getMedalColor()}
      />
      <View className="flex-1 ml-3 mr-3">
        <Text className="text-sm font-semibold mb-1 text-neutral-dark">
          {isCurrentUser ? 'You' : name}
        </Text>
        <ProgressBar
          progress={maxSteps > 0 ? steps / maxSteps : 0}
          height="thin"
          inverted={isCurrentUser}
        />
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-neutral-dark">
          {steps.toLocaleString()}
        </Text>
        {prizeAmount !== undefined && prizeAmount > 0 && (
          <Text className="text-[10px] font-bold text-green-600">
            {formatDollars(prizeAmount)}
          </Text>
        )}
      </View>
    </Container>
  );
}
