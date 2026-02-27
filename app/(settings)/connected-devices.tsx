import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelpCircle, Info } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { DeviceCard } from '@/components/ui/DeviceCard';
import {
  useHealthKitAvailable,
  useIsAppleHealthConnected,
  useLastSyncTime,
  useConnectAppleHealth,
  useDisconnectAppleHealth,
  useSyncHealthData,
} from '@/hooks/useHealthKit';

export default function ConnectedDevicesScreen() {
  const { data: isAvailable, isLoading: isCheckingAvailability } = useHealthKitAvailable();
  const isConnected = useIsAppleHealthConnected();
  const lastSyncTime = useLastSyncTime();
  const connectMutation = useConnectAppleHealth();
  const disconnectMutation = useDisconnectAppleHealth();
  const syncMutation = useSyncHealthData();

  function formatLastSynced(isoDate: string | null): string {
    if (!isoDate) return 'Never';
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function handleDisconnect() {
    Alert.alert(
      'Disconnect Apple Health',
      'Your existing step data will be kept. You can reconnect at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate(),
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Connected Devices"
        rightIcon={<HelpCircle size={20} color={Colors.neutralDark} />}
      />
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Primary Connection */}
        <Text className="text-sm font-bold text-neutral-dark mt-4 mb-3">
          Primary Connection
        </Text>

        {isCheckingAvailability ? (
          <View className="bg-white rounded-xl border border-border p-4 mb-4">
            <Text className="text-sm text-muted-text">
              Checking Apple Health availability...
            </Text>
          </View>
        ) : isAvailable === false ? (
          <View className="bg-white rounded-xl border border-border p-4 mb-4">
            <Text className="text-sm text-muted-text">
              Apple Health is not available on this device.
            </Text>
          </View>
        ) : isConnected ? (
          <DeviceCard
            name="Apple Health / Apple Watch"
            isPrimary
            isSynced
            lastSynced={formatLastSynced(lastSyncTime)}
            onSync={() => syncMutation.mutate()}
            onSettings={handleDisconnect}
          />
        ) : (
          <DeviceCard
            name="Apple Health / Apple Watch"
            onConnect={() => connectMutation.mutate()}
            isLoading={connectMutation.isPending}
          />
        )}

        {connectMutation.error && (
          <Text className="text-xs text-red-500 -mt-2 mb-2 px-1">
            {connectMutation.error.message}
          </Text>
        )}

        {/* Other Services */}
        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-sm font-bold text-neutral-dark">Other Services</Text>
        </View>

        <View className="bg-white rounded-xl border border-border mb-2 px-4 py-3 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-progress-bg items-center justify-center mr-3">
            <Text className="text-lg">⌚</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-dark">Garmin Connect</Text>
            <Text className="text-xs text-muted-text">Coming soon</Text>
          </View>
          <Text className="text-xs font-semibold text-muted-text/60 uppercase">Coming Soon</Text>
        </View>

        <View className="bg-white rounded-xl border border-border mb-2 px-4 py-3 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-progress-bg items-center justify-center mr-3">
            <Text className="text-lg">💚</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-dark">Fitbit</Text>
            <Text className="text-xs text-muted-text">Coming soon</Text>
          </View>
          <Text className="text-xs font-semibold text-muted-text/60 uppercase">Coming Soon</Text>
        </View>

        {/* Info Box */}
        <View className="bg-primary/10 rounded-xl p-4 mt-4 mb-8 flex-row">
          <Info size={18} color={Colors.mutedText} />
          <Text className="text-xs text-muted-text ml-3 flex-1 leading-4">
            Connecting your devices allows Stride to track your steps, calories,
            distance, and active minutes for fitness challenges.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
