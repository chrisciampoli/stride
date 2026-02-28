import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

type InputSize = 'default' | 'large';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightLabel?: string;
  error?: string;
  size?: InputSize;
  showCharCount?: boolean;
}

export function Input({
  label,
  leftIcon,
  rightLabel,
  error,
  size = 'default',
  showCharCount,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const isLarge = size === 'large';

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-semibold text-neutral-dark/70 uppercase tracking-wider ml-1 mb-2">
          {label}
        </Text>
      )}
      <View
        className={`
          ${isLarge ? 'h-16' : 'h-14'}
          bg-white rounded-xl flex-row items-center px-4
          ${focused ? 'border border-primary' : 'border border-transparent'}
          ${error ? 'border border-red-500' : ''}
        `}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className={`
            flex-1
            ${isLarge ? 'text-2xl font-bold' : 'text-lg'}
            text-neutral-dark
          `}
          placeholderTextColor="#A07850"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...textInputProps}
        />
        {rightLabel && (
          <Text className="text-sm text-muted-text font-medium ml-2">
            {rightLabel}
          </Text>
        )}
      </View>
      <View className="flex-row justify-between">
        {error ? (
          <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
        ) : <View />}
        {showCharCount && textInputProps.maxLength && (
          <Text className="text-muted-text text-xs mt-1 mr-1">
            {(typeof textInputProps.value === 'string' ? textInputProps.value.length : 0)}/{textInputProps.maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}
