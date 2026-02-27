import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  autoFocus,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`
        h-12 bg-white rounded-xl flex-row items-center pl-10 pr-4
        ${focused ? 'border border-primary' : 'border border-transparent'}
      `}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <View className="absolute left-3">
        <Search size={18} color={Colors.mutedText} strokeWidth={2} />
      </View>
      <TextInput
        className="flex-1 text-sm text-neutral-dark"
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedText}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}
