import React from 'react';
import { View, Image, Text } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarBorder = 'gold' | 'silver' | 'bronze' | 'primary' | 'white' | 'none';

interface AvatarProps {
  uri?: string | null;
  initials?: string;
  size?: AvatarSize;
  border?: AvatarBorder;
  showOnline?: boolean;
}

const sizeMap = {
  xs: 20,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 128,
} as const;

const borderColorMap = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  primary: '#E85D0A',
  white: '#FFFFFF',
  none: 'transparent',
} as const;

const initialsTextSize = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-3xl',
} as const;

export function Avatar({
  uri,
  initials,
  size = 'md',
  border = 'none',
  showOnline = false,
}: AvatarProps) {
  const px = sizeMap[size];
  const borderWidth = border !== 'none' ? (size === 'xl' ? 3 : 2) : 0;

  return (
    <View style={{ width: px, height: px, position: 'relative' }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            borderWidth,
            borderColor: borderColorMap[border],
          }}
        />
      ) : (
        <View
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            borderWidth,
            borderColor: borderColorMap[border],
          }}
          className="bg-neutral-dark items-center justify-center"
        >
          <Text className={`text-white font-bold ${initialsTextSize[size]}`}>
            {initials ?? '?'}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          className="bg-success absolute rounded-full border-2 border-white"
          style={{
            width: px * 0.25,
            height: px * 0.25,
            bottom: 0,
            right: 0,
          }}
        />
      )}
    </View>
  );
}
