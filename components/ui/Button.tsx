import React from 'react';
import { Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-primary',
  secondary: 'bg-white border border-primary/20',
  ghost: 'bg-transparent',
} as const;

const variantTextStyles = {
  primary: 'text-neutral-dark font-bold',
  secondary: 'text-neutral-dark font-semibold',
  ghost: 'text-neutral-dark font-semibold',
} as const;

const sizeStyles = {
  sm: 'py-3 px-5',
  md: 'h-14 px-6',
  lg: 'h-16 px-8',
} as const;

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shadowStyle: ViewStyle =
    variant === 'primary'
      ? {
          shadowColor: '#E85D0A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }
      : {};

  return (
    <Animated.View
      style={[animatedStyle, shadowStyle]}
      className={`${fullWidth ? 'w-full' : ''}`}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
        disabled={disabled}
        className={`
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          rounded-xl flex-row items-center justify-center gap-2
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {iconLeft}
        <Text
          className={`
            ${variantTextStyles[variant]}
            ${sizeTextStyles[size]}
            uppercase tracking-wider
          `}
        >
          {children}
        </Text>
        {iconRight}
      </Pressable>
    </Animated.View>
  );
}
