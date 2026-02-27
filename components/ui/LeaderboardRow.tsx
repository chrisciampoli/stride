import React from 'react';
import { View, Text } from 'react-native';
import { Avatar, type AvatarBorder } from './Avatar';
import { ProgressBar } from './ProgressBar';

interface LeaderboardRowProps {
  rank: number;
  name: string;
  steps: number;
  maxSteps: number;
  avatarUri?: string;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({
  rank,
  name,
  steps,
  maxSteps,
  avatarUri,
  isCurrentUser = false,
}: LeaderboardRowProps) {
  const getMedalColor = (): AvatarBorder => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'none';
  };

  return (
    <View
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
      <Text className="text-sm font-bold text-neutral-dark">
        {steps.toLocaleString()}
      </Text>
    </View>
  );
}
