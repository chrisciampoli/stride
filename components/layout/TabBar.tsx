import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Trophy, Users, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const tabs = [
  { name: 'index', label: 'HOME', icon: House },
  { name: 'challenges', label: 'CHALLENGES', icon: Trophy },
  { name: 'friends', label: 'FRIENDS', icon: Users },
  { name: 'profile', label: 'PROFILE', icon: User },
] as const;

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      className="flex-row px-6 pt-3 border-t border-[#F5EDE3]"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {tabs.map((tab, index) => {
        const isActive = state.index === index;
        const Icon = tab.icon;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              const route = state.routes[index];
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            className="flex-1 flex-col items-center gap-1"
          >
            <Icon
              size={24}
              color={isActive ? Colors.neutralDark : Colors.mutedText}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            <Text
              className={`
                text-[10px] uppercase tracking-widest
                ${isActive ? 'text-neutral-dark font-bold' : 'text-muted-text font-medium'}
              `}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={80} tint="light" className="absolute bottom-0 left-0 right-0">
        {content}
      </BlurView>
    );
  }

  return (
    <View className="bg-white/95">
      {content}
    </View>
  );
}
