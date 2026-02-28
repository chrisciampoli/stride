import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  className?: string;
}

function SkeletonPulse({ width = '100%', height = 16, borderRadius = 8, className }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius, opacity }}
      className={`bg-border ${className ?? ''}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-border">
      <SkeletonPulse width="60%" height={14} className="mb-3" />
      <SkeletonPulse width="100%" height={8} className="mb-2" />
      <View className="flex-row justify-between mt-2">
        <SkeletonPulse width="30%" height={10} />
        <SkeletonPulse width="20%" height={10} />
      </View>
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View className="flex-row items-center py-3 px-3 bg-white rounded-xl mb-2">
      <SkeletonPulse width={24} height={24} borderRadius={12} />
      <View className="flex-1 ml-3">
        <SkeletonPulse width="50%" height={12} className="mb-1" />
        <SkeletonPulse width="80%" height={6} />
      </View>
      <SkeletonPulse width={40} height={12} />
    </View>
  );
}

export function SkeletonProfile() {
  return (
    <View className="items-center pt-6 pb-4">
      <SkeletonPulse width={80} height={80} borderRadius={40} />
      <SkeletonPulse width={120} height={16} className="mt-3" />
      <SkeletonPulse width={80} height={10} className="mt-2" />
    </View>
  );
}

export function SkeletonScreen({ rows = 5 }: { rows?: number }) {
  return (
    <View className="px-6 pt-4">
      <SkeletonCard />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

export { SkeletonPulse };
