import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Badge } from './Badge';
import { Users } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface CommunityChallengeCardProps {
  title: string;
  badge?: string;
  participantCount?: number;
  onPress?: () => void;
}

export function CommunityChallengeCard({
  title,
  badge,
  participantCount,
  onPress,
}: CommunityChallengeCardProps) {
  return (
    <Pressable onPress={onPress}>
      <View className="w-44 bg-white border border-border rounded-xl p-3 mr-3">
        {badge && (
          <View className="self-start mb-2">
            <Badge style="subtle">{badge}</Badge>
          </View>
        )}
        <Text className="text-sm font-bold text-neutral-dark mb-2" numberOfLines={2}>
          {title}
        </Text>
        {participantCount !== undefined && (
          <View className="flex-row items-center">
            <Users size={12} color={Colors.neutralMuted} />
            <Text className="text-xs text-muted-text ml-1">
              {participantCount >= 1000
                ? `${(participantCount / 1000).toFixed(1)}k`
                : participantCount}{' '}
              Participants
            </Text>
          </View>
        )}
        <Text className="text-xs font-semibold text-neutral-dark mt-2">
          Join Challenge
        </Text>
      </View>
    </Pressable>
  );
}
