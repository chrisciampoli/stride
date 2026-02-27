import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from './Avatar';

interface AvatarGroupProps {
  uris: (string | null)[];
  size?: 'xs' | 'sm' | 'md';
  max?: number;
}

const sizeMap = { xs: 20, sm: 32, md: 40 } as const;

export function AvatarGroup({ uris, size = 'sm', max = 3 }: AvatarGroupProps) {
  const shown = uris.slice(0, max);
  const overflow = uris.length - max;
  const px = sizeMap[size];
  const overlap = px * 0.3;

  return (
    <View className="flex-row items-center">
      {shown.map((uri, i) => (
        <View
          key={i}
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: max - i }}
        >
          <Avatar uri={uri} size={size} border="white" />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: -overlap,
            width: px,
            height: px,
            borderRadius: px / 2,
          }}
          className="bg-progress-bg items-center justify-center border-2 border-white"
        >
          <Text className="text-[10px] font-bold text-muted-text">
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
