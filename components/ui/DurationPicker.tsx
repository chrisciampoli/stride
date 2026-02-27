import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface DurationPickerProps {
  options: { label: string; value: number }[];
  selected: number;
  onSelect: (value: number) => void;
}

export function DurationPicker({ options, selected, onSelect }: DurationPickerProps) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          className={`px-5 py-2.5 rounded-full border ${
            selected === opt.value
              ? 'bg-primary border-primary'
              : 'bg-white border-border'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selected === opt.value ? 'text-neutral-dark' : 'text-muted-text'
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
