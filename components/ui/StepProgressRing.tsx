import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, withTiming, useAnimatedProps } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StepProgressRingProps {
  steps: number;
  goal: number;
  size?: number;
}

export function StepProgressRing({ steps, goal, size = 220 }: StepProgressRingProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(steps / goal, 1), { duration: 1000 });
  }, [steps, goal]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const remaining = Math.max(goal - steps, 0);

  return (
    <View className="items-center justify-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E8DED0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E85D0A"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-4xl font-bold text-neutral-dark">
            {steps.toLocaleString()}
          </Text>
          <Text className="text-sm text-muted-text">
            / {goal.toLocaleString()} steps
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center bg-progress-bg rounded-full px-3 py-1.5">
        <Text className="text-xs text-muted-text">
          ⬇ {remaining.toLocaleString()} to reach goal
        </Text>
      </View>
    </View>
  );
}
