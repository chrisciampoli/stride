import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type ProgressHeight = 'thin' | 'standard';

interface ProgressBarProps {
  progress: number; // 0-1
  height?: ProgressHeight;
  inverted?: boolean;
  glow?: boolean;
}

const heightStyles = {
  thin: 'h-1.5',
  standard: 'h-3',
} as const;

export function ProgressBar({
  progress,
  height = 'standard',
  inverted = false,
  glow = false,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 600,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const glowStyle: ViewStyle = glow
    ? {
        shadowColor: '#E85D0A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
      }
    : {};

  return (
    <View
      className={`
        ${heightStyles[height]}
        ${inverted ? 'bg-white/30' : 'bg-[#E8DED0]'}
        rounded-full w-full overflow-hidden
      `}
    >
      <Animated.View
        style={[animatedStyle, glowStyle]}
        className={`
          ${heightStyles[height]}
          ${inverted ? 'bg-neutral-dark' : 'bg-primary'}
          rounded-full
        `}
      />
    </View>
  );
}
