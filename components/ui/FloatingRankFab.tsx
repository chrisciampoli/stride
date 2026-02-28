import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ordinal, formatDollars } from '@/lib/format';

interface FloatingRankFabProps {
  rank: number;
  steps: string;
  prizeAmount?: number;
  onPress?: () => void;
}

export function FloatingRankFab({ rank, steps, prizeAmount, onPress }: FloatingRankFabProps) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6"
      style={{
        shadowColor: '#E85D0A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View className="bg-primary rounded-2xl px-4 py-3 flex-row items-center">
        <View className="bg-neutral-dark rounded-lg px-2 py-1 mr-2">
          <Text className="text-primary text-xs font-bold">{ordinal(rank)}</Text>
        </View>
        <View>
          <Text className="text-[10px] text-neutral-dark/60 uppercase font-bold">
            Your Rank
          </Text>
          <Text className="text-xs font-bold text-neutral-dark">{steps}</Text>
          {prizeAmount !== undefined && prizeAmount > 0 && (
            <Text className="text-[10px] font-bold text-green-800">
              {formatDollars(prizeAmount)} prize
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
