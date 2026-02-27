import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 bg-white rounded-xl mb-2"
    >
      <View className="mr-3">{icon}</View>
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            destructive ? 'text-red-500' : 'text-neutral-dark'
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-xs text-muted-text mt-0.5">{subtitle}</Text>
        )}
      </View>
      {!destructive && <ChevronRight size={20} color={Colors.neutralMuted} />}
    </Pressable>
  );
}
