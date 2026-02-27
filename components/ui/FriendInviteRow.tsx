import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Avatar } from './Avatar';
import { Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface FriendInviteRowProps {
  name: string;
  handle: string;
  avatarUri?: string;
  selected: boolean;
  onToggle: () => void;
}

export function FriendInviteRow({
  name,
  handle,
  avatarUri,
  selected,
  onToggle,
}: FriendInviteRowProps) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center py-3">
      <Avatar uri={avatarUri} initials={name.charAt(0)} size="md" />
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-neutral-dark">{name}</Text>
        <Text className="text-xs text-muted-text">{handle}</Text>
      </View>
      <View
        className={`w-6 h-6 rounded-full items-center justify-center ${
          selected ? 'bg-primary' : 'border-2 border-border'
        }`}
      >
        {selected && <Check size={14} color={Colors.neutralDark} />}
      </View>
    </Pressable>
  );
}
