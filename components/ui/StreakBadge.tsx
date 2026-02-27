import React from 'react';
import { View, Text } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface StreakBadgeProps {
  streak: number;
  freezes?: number;
}

export function StreakBadge({ streak, freezes = 0 }: StreakBadgeProps) {
  const isActive = streak > 0;

  return (
    <View className="flex-row items-center">
      <View
        className={`flex-row items-center px-3 py-1.5 rounded-full ${
          isActive ? 'bg-primary/15' : 'bg-neutral-dark/5'
        }`}
      >
        <Flame
          size={16}
          color={isActive ? Colors.primary : Colors.neutralMuted}
          fill={isActive ? Colors.primary : 'transparent'}
        />
        <Text
          className={`text-sm font-bold ml-1 ${
            isActive ? 'text-primary' : 'text-muted-text'
          }`}
        >
          {streak}
        </Text>
      </View>
      {freezes > 0 && (
        <View className="flex-row items-center ml-1.5">
          {Array.from({ length: freezes }).map((_, i) => (
            <View
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400 ml-0.5"
            />
          ))}
        </View>
      )}
    </View>
  );
}
