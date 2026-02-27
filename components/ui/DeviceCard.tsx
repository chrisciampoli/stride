import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { RefreshCw, Settings } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface DeviceCardProps {
  name: string;
  isPrimary?: boolean;
  isSynced?: boolean;
  lastSynced?: string;
  onSync?: () => void;
  onSettings?: () => void;
  onConnect?: () => void;
  connected?: boolean;
  isLoading?: boolean;
}

export function DeviceCard({
  name,
  isPrimary = false,
  isSynced = false,
  lastSynced,
  onSync,
  onSettings,
  onConnect,
  connected = false,
  isLoading = false,
}: DeviceCardProps) {
  if (isPrimary) {
    return (
      <Card className="mb-4">
        <View className="flex-row items-center mb-2">
          {isSynced && <Badge style="lime">SYNCED</Badge>}
          <Text className="text-xs text-muted-text ml-2">Auto-sync active</Text>
        </View>
        <Text className="text-lg font-bold text-neutral-dark mb-1">{name}</Text>
        {lastSynced && (
          <Text className="text-xs text-muted-text mb-4">
            ⏱ Last synced: {lastSynced}
          </Text>
        )}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="primary" size="sm" onPress={onSync} fullWidth>
              ↻ Sync Now
            </Button>
          </View>
          <Pressable
            onPress={onSettings}
            className="w-12 h-12 rounded-xl border border-border items-center justify-center"
          >
            <Settings size={20} color={Colors.neutralMuted} />
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <View className="flex-row items-center py-3 px-4 bg-white rounded-xl mb-2">
      <View className="w-10 h-10 rounded-full bg-progress-bg items-center justify-center mr-3">
        <Text className="text-lg">⌚</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-neutral-dark">{name}</Text>
      </View>
      {connected ? (
        <Badge style="lime">Connected</Badge>
      ) : isLoading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text className="text-sm font-semibold text-muted-text">Connecting...</Text>
        </View>
      ) : (
        <Pressable onPress={onConnect}>
          <Text className="text-sm font-semibold text-neutral-dark">Connect</Text>
        </Pressable>
      )}
    </View>
  );
}
