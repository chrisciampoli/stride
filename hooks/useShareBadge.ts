import { useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export function useShareBadge() {
  const viewRef = useRef<View>(null);

  const share = useCallback(async () => {
    if (!viewRef.current) return;

    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
      });

      if (Platform.OS === 'web') {
        Alert.alert('Sharing', 'Sharing is not supported on web.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your badge',
      });
    } catch {
      Alert.alert('Error', 'Could not share badge. Please try again.');
    }
  }, []);

  return { viewRef, share };
}
