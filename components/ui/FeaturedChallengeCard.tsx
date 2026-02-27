import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Badge } from './Badge';
import { Button } from './Button';

interface FeaturedChallengeCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  participantCount?: number;
  onPress?: () => void;
}

export function FeaturedChallengeCard({
  title,
  subtitle,
  imageUrl,
  badge,
  participantCount,
  onPress,
}: FeaturedChallengeCardProps) {
  const content = (
    <View className="rounded-2xl overflow-hidden bg-neutral-dark">
      <View className="h-48 justify-end p-4 bg-neutral-dark/40">
        {badge && (
          <View className="self-start mb-2">
            <Badge style="lime">{badge}</Badge>
          </View>
        )}
        <Text className="text-white text-xl font-bold">{title}</Text>
        {subtitle && (
          <Text className="text-white/70 text-sm mt-1">{subtitle}</Text>
        )}
      </View>
      <View className="p-4">
        <Button variant="primary" size="md" onPress={onPress} fullWidth>
          Join Now →
        </Button>
      </View>
    </View>
  );

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
