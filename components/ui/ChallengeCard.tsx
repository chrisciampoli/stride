import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { AvatarGroup } from './AvatarGroup';
import { Badge } from './Badge';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface ChallengeCardProps {
  name: string;
  status?: string;
  currentSteps: number;
  goalSteps: number;
  participantCount: number;
  timeLeft?: string;
  avatars?: string[];
  onPress?: () => void;
}

export function ChallengeCard({
  name,
  status,
  currentSteps,
  goalSteps,
  participantCount,
  timeLeft,
  avatars = [],
  onPress,
}: ChallengeCardProps) {
  const progress = goalSteps > 0 ? currentSteps / goalSteps : 0;
  const percentage = Math.round(progress * 100);

  return (
    <Pressable onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <Text className="text-base font-bold text-neutral-dark">{name}</Text>
            {status && (
              <View className="ml-2">
                <Badge style="subtle">{status}</Badge>
              </View>
            )}
          </View>
          {timeLeft && (
            <Text className="text-xs text-muted-text">TIME LEFT: {timeLeft}</Text>
          )}
        </View>
        <View className="flex-row items-center mb-2">
          <View className="flex-1 mr-3">
            <ProgressBar progress={progress} height="standard" />
          </View>
          <Text className="text-xs font-bold text-muted-text">{percentage}%</Text>
        </View>
        <Text className="text-xs text-muted-text mb-3">
          {currentSteps.toLocaleString()} / {goalSteps.toLocaleString()} steps
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {avatars.length > 0 && <AvatarGroup uris={avatars} size="xs" max={3} />}
            <Text className="text-xs text-muted-text ml-2">
              {participantCount} friends joined
            </Text>
          </View>
          <Pressable onPress={onPress} className="flex-row items-center">
            <Text className="text-xs font-semibold text-neutral-dark mr-0.5">Details</Text>
            <ChevronRight size={14} color={Colors.neutralDark} />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}
