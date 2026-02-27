import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  children?: React.ReactNode;
}

export function HeroCard({
  title,
  subtitle,
  buttonLabel,
  onButtonPress,
  children,
}: HeroCardProps) {
  return (
    <View
      className="bg-neutral-dark rounded-2xl p-5 overflow-hidden"
      style={{
        shadowColor: '#E85D0A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {children}
      <Text className="text-white text-lg font-bold mb-1">{title}</Text>
      {subtitle && (
        <Text className="text-white/60 text-sm mb-4">{subtitle}</Text>
      )}
      {buttonLabel && (
        <Button variant="primary" size="sm" onPress={onButtonPress} fullWidth>
          {buttonLabel}
        </Button>
      )}
    </View>
  );
}
