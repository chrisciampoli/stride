import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}

export function StatCard({ icon, value, label, highlight = false }: StatCardProps) {
  return (
    <View
      className={`flex-1 items-center rounded-xl py-4 px-2 ${
        highlight ? 'bg-primary' : 'bg-white border border-border'
      }`}
    >
      <View className="mb-2">{icon}</View>
      <Text className="text-lg font-bold text-neutral-dark">
        {value}
      </Text>
      <Text
        className={`text-xs mt-0.5 ${
          highlight ? 'text-neutral-dark/70' : 'text-muted-text'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
