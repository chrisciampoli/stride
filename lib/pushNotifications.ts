import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { NotificationType } from '@/types';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications don't work in simulator
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not determined
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('Missing EAS project ID for push notifications');
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // iOS-specific: set badge count to 0 on registration
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }

  return token;
}

export function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * Map notification type to the screen route for tap navigation
 */
export function getRouteForNotification(
  type: NotificationType,
  data: Record<string, unknown>,
): string | null {
  switch (type) {
    case 'challenge_invite':
    case 'challenge_started':
      return data.challenge_id ? `/(challenge)/${data.challenge_id}/details` : null;
    case 'challenge_completed':
    case 'rank_change':
      return data.challenge_id ? `/(challenge)/${data.challenge_id}/leaderboard` : null;
    case 'friend_request':
      return '/(tabs)/friends';
    case 'friend_accepted':
    case 'nudge':
      return data.friend_id ? `/(social)/friend/${data.friend_id}` : null;
    case 'badge_earned':
      return data.badge_id ? `/badge/${data.badge_id}` : null;
    case 'goal_reached':
      return '/(tabs)';
    case 'announcement':
      return '/(social)/notifications';
    default:
      return null;
  }
}
