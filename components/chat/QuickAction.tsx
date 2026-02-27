import React from 'react';
import { Text, Pressable } from 'react-native';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

export function QuickAction({ icon, label, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-white border border-border rounded-full px-4 py-2 mr-2"
    >
      {icon}
      <Text className="text-xs font-medium text-neutral-dark ml-1.5">
        {label}
      </Text>
    </Pressable>
  );
}
