import React, { useEffect, useRef } from 'react';
import { Animated, Text, Pressable } from 'react-native';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import { useToastStore } from '@/stores/toastStore';

const VARIANT_CONFIG = {
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    Icon: CheckCircle,
    iconColor: '#078818',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    Icon: XCircle,
    iconColor: '#ef4444',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    Icon: Info,
    iconColor: '#3b82f6',
  },
} as const;

export function Toast() {
  const { visible, message, variant, hide } = useToastStore();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  if (!visible && !message) return null;

  const config = VARIANT_CONFIG[variant];
  const { Icon } = config;

  return (
    <Animated.View
      style={{ transform: [{ translateY }] }}
      className={`absolute top-12 left-6 right-6 z-50 flex-row items-center border rounded-xl px-4 py-3 ${config.bg}`}
    >
      <Icon size={18} color={config.iconColor} />
      <Text className={`flex-1 text-sm font-medium ml-2 ${config.text}`}>
        {message}
      </Text>
      <Pressable onPress={hide} hitSlop={8}>
        <X size={16} color={config.iconColor} />
      </Pressable>
    </Animated.View>
  );
}
