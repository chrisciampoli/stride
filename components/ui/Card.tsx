import React from 'react';
import { View, type ViewStyle } from 'react-native';

type CardVariant = 'default' | 'dark';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-white border border-border',
  dark: 'bg-neutral-dark',
} as const;

export function Card({ variant = 'default', className = '', children }: CardProps) {
  const shadowStyle: ViewStyle =
    variant === 'default'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }
      : {};

  return (
    <View
      style={shadowStyle}
      className={`${variantStyles[variant]} rounded-xl p-4 ${className}`}
    >
      {children}
    </View>
  );
}
