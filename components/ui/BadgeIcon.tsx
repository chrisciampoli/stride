import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Award,
  Zap,
  Trophy,
  Flame,
  Mountain,
  Sun,
  Moon,
  Users,
  Timer,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  bolt: Zap,
  trophy: Trophy,
  military_tech: Award,
  local_fire_department: Flame,
  terrain: Mountain,
  wb_sunny: Sun,
  nightlight: Moon,
  groups: Users,
  sprint: Timer,
};

interface BadgeIconProps {
  icon: string;
  name: string;
  earned?: boolean;
  onPress?: () => void;
}

export function BadgeIcon({ icon, name, earned = false, onPress }: BadgeIconProps) {
  const IconComponent = iconMap[icon] ?? Award;

  return (
    <Pressable onPress={onPress} className="items-center mx-2">
      <View
        className={`w-16 h-16 rounded-full items-center justify-center mb-1.5 ${
          earned ? 'bg-primary/20' : 'bg-neutral-dark/5'
        }`}
        style={
          earned
            ? {
                shadowColor: '#E85D0A',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }
            : {}
        }
      >
        <IconComponent
          size={28}
          color={earned ? Colors.neutralDark : '#c4c4c4'}
        />
      </View>
      <Text
        className={`text-[11px] text-center ${
          earned ? 'text-neutral-dark font-medium' : 'text-muted-text'
        }`}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}
