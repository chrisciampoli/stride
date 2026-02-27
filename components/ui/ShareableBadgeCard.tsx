import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { Award, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface ShareableBadgeCardProps {
  badgeName: string;
  badgeDescription: string;
  earnedDate: string | null;
}

export const ShareableBadgeCard = forwardRef<View, ShareableBadgeCardProps>(
  function ShareableBadgeCard({ badgeName, badgeDescription, earnedDate }, ref) {
    const formattedDate = earnedDate
      ? new Date(earnedDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return (
      <View
        ref={ref}
        className="bg-white rounded-2xl p-6 items-center"
        style={{ width: 320 }}
      >
        {/* Badge Icon */}
        <View
          className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-4"
          style={{
            shadowColor: '#E85D0A',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Award size={40} color={Colors.neutralDark} />
        </View>

        {/* Badge Name */}
        <Text className="text-xl font-bold text-neutral-dark mb-2 text-center">
          {badgeName}
        </Text>

        {/* Description */}
        <Text className="text-sm text-muted-text text-center mb-3 leading-5">
          {badgeDescription}
        </Text>

        {/* Earned Date */}
        {formattedDate && (
          <View className="flex-row items-center mb-4">
            <Zap size={14} color={Colors.primary} />
            <Text className="text-xs text-primary font-semibold ml-1">
              Earned on {formattedDate}
            </Text>
          </View>
        )}

        {/* Branding */}
        <View className="border-t border-border pt-3 w-full items-center">
          <Text className="text-xs text-muted-text font-bold tracking-wider uppercase">
            Stride
          </Text>
        </View>
      </View>
    );
  },
);
