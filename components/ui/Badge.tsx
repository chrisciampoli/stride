import React from 'react';
import { View, Text } from 'react-native';

type BadgeStyle = 'lime' | 'dark' | 'subtle' | 'muted';

interface BadgeProps {
  style?: BadgeStyle;
  children: React.ReactNode;
}

const badgeStyles = {
  lime: 'bg-primary',
  dark: 'bg-neutral-dark',
  subtle: 'bg-primary/10',
  muted: 'bg-progress-bg',
} as const;

const textStyles = {
  lime: 'text-neutral-dark',
  dark: 'text-primary',
  subtle: 'text-neutral-dark',
  muted: 'text-muted-text',
} as const;

export function Badge({ style = 'lime', children }: BadgeProps) {
  return (
    <View className={`${badgeStyles[style]} rounded-full px-2.5 py-0.5`}>
      <Text
        className={`${textStyles[style]} text-[10px] font-bold uppercase tracking-wider`}
      >
        {children}
      </Text>
    </View>
  );
}
