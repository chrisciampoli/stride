import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
}

export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightIcon,
  onRightPress,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="bg-background-light/80 border-b border-border px-4 py-4 flex-row items-center">
      {showBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          className="w-11 h-11 rounded-full bg-white items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <ChevronLeft size={20} color={Colors.neutralDark} strokeWidth={2} />
        </Pressable>
      ) : (
        <View className="w-11 h-11" />
      )}

      <Text className="flex-1 text-center text-lg font-bold text-neutral-dark">
        {title}
      </Text>

      {rightIcon ? (
        <Pressable
          onPress={onRightPress}
          className="w-11 h-11 rounded-full bg-white items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          {rightIcon}
        </Pressable>
      ) : (
        <View className="w-11 h-11" />
      )}
    </View>
  );
}
