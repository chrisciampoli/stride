import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import { registerForPushNotifications, getRouteForNotification } from '@/lib/pushNotifications';
import { useRegisterPushToken } from '@/hooks/mutations/useRegisterPushToken';
import type { NotificationType } from '@/types';

/**
 * Registers the device push token after auth
 */
export function useRegisterPushOnAuth() {
  const session = useAuthStore((s) => s.session);
  const { mutate: registerToken } = useRegisterPushToken();

  useEffect(() => {
    if (!session) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        registerToken(token);
      }
    });
  }, [session, registerToken]);
}

/**
 * Listens for notification taps and routes to the appropriate screen
 */
export function usePushNotificationListeners() {
  const router = useRouter();
  const lastResponseRef = useRef<string | null>(null);

  useEffect(() => {
    // Handle notification tap when app is running
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { notification } = response;
        const data = notification.request.content.data as {
          type?: NotificationType;
          [key: string]: unknown;
        };

        if (!data?.type) return;

        // Deduplicate responses
        const responseId = response.notification.request.identifier;
        if (lastResponseRef.current === responseId) return;
        lastResponseRef.current = responseId;

        const route = getRouteForNotification(data.type, data);
        if (route) {
          router.push(route as never);
        }
      },
    );

    return () => subscription.remove();
  }, [router]);

  // Handle notification tap that opened the app from killed state
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;

      const data = response.notification.request.content.data as {
        type?: NotificationType;
        [key: string]: unknown;
      };

      if (!data?.type) return;

      const responseId = response.notification.request.identifier;
      if (lastResponseRef.current === responseId) return;
      lastResponseRef.current = responseId;

      const route = getRouteForNotification(data.type, data);
      if (route) {
        router.push(route as never);
      }
    });
  }, [router]);
}
