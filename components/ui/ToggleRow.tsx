import React from 'react';
import { View, Text } from 'react-native';
import { Toggle } from './Toggle';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: ToggleRowProps) {
  return (
    <View className="flex-row items-center py-4 px-4 bg-white rounded-xl mb-2">
      <View className="mr-3">{icon}</View>
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-neutral-dark">{label}</Text>
        {description && (
          <Text className="text-xs text-muted-text mt-0.5">{description}</Text>
        )}
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}
