import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationSettings } from '@/hooks/useSettings';
import {
  getHealthKitAvailability,
  requestHealthKitPermissions,
  enableStepBackgroundDelivery,
  disableHealthKitBackground,
} from '@/lib/healthKit';
import { syncHealthData, disconnectHealthKit } from '@/lib/healthSync';

export function useHealthKitAvailable() {
  return useQuery({
    queryKey: ['healthKit', 'available'],
    queryFn: getHealthKitAvailability,
    staleTime: Infinity,
  });
}

export function useIsAppleHealthConnected() {
  const { data: settings } = useNotificationSettings();
  return settings?.connected_device === 'apple_health';
}

export function useLastSyncTime() {
  const { data: settings } = useNotificationSettings();
  return settings?.device_last_synced_at ?? null;
}

export function useConnectAppleHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const status = await requestHealthKitPermissions();
      if (status !== 'authorized') {
        throw new Error(
          status === 'unavailable'
            ? 'HealthKit is not available on this device.'
            : 'HealthKit permission denied. Go to Settings > Health > Stride to enable access.',
        );
      }

      await enableStepBackgroundDelivery();

      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in.');
      const result = await syncHealthData(user.id, 14);
      if (!result.success) {
        throw new Error(result.error ?? 'Initial sync failed.');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useDisconnectAppleHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in.');
      await disableHealthKitBackground();
      await disconnectHealthKit(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useSyncHealthData() {
  return useMutation({
    mutationFn: async () => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in.');
      const result = await syncHealthData(user.id, 7);
      if (!result.success) {
        throw new Error(result.error ?? 'Sync failed.');
      }
      return result;
    },
  });
}

export function useHealthSyncOnForeground() {
  const isConnected = useIsAppleHealthConnected();
  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    const user = useAuthStore.getState().user;
    if (!user || !isConnected || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await syncHealthData(user.id, 7);
    } finally {
      syncingRef.current = false;
    }
  }, [isConnected]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runSync();
      }
    });

    return () => sub.remove();
  }, [runSync]);
}
