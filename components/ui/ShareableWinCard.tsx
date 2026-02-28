import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { Trophy, Footprints } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { formatDollars, ordinal } from '@/lib/format';

interface ShareableWinCardProps {
  challengeName: string;
  place: number;
  amountCents: number;
  totalSteps: number;
  earnedDate: string | null;
}

export const ShareableWinCard = forwardRef<View, ShareableWinCardProps>(
  function ShareableWinCard({ challengeName, place, amountCents, totalSteps, earnedDate }, ref) {
    const formattedDate = earnedDate
      ? new Date(earnedDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    const miles = (totalSteps * 0.000473).toFixed(1);

    return (
      <View
        ref={ref}
        className="bg-white rounded-2xl p-6 items-center"
        style={{ width: 320 }}
      >
        {/* Trophy Icon */}
        <View
          className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4"
          style={{
            shadowColor: '#078818',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Trophy size={40} color="#078818" />
        </View>

        {/* Place */}
        <Text className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">
          {ordinal(place)} Place
        </Text>

        {/* Prize Amount */}
        <Text className="text-3xl font-bold text-neutral-dark mb-2">
          {formatDollars(amountCents)}
        </Text>

        {/* Challenge Name */}
        <Text className="text-sm text-muted-text text-center mb-3">
          {challengeName}
        </Text>

        {/* Steps + Miles */}
        <View className="flex-row items-center bg-background-light rounded-xl px-4 py-2 mb-3">
          <Footprints size={14} color={Colors.neutralDark} />
          <Text className="text-xs font-semibold text-neutral-dark ml-1.5">
            {totalSteps.toLocaleString()} steps ({miles} mi)
          </Text>
        </View>

        {/* Date */}
        {formattedDate && (
          <Text className="text-xs text-muted-text mb-4">
            Won on {formattedDate}
          </Text>
        )}

        {/* Branding */}
        <View className="border-t border-border pt-3 w-full items-center">
          <Text className="text-xs text-muted-text font-bold tracking-wider uppercase">
            Allen Footrace
          </Text>
        </View>
      </View>
    );
  },
);
