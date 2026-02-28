import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export function useAppleAuth() {
  const [isPending, setIsPending] = useState(false);

  const signIn = async () => {
    if (Platform.OS !== 'ios') return;
    setIsPending(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Apple only provides the name on first sign-in — save it
      if (credential.fullName) {
        const parts: string[] = [];
        if (credential.fullName.givenName) parts.push(credential.fullName.givenName);
        if (credential.fullName.familyName) parts.push(credential.fullName.familyName);
        const fullName = parts.join(' ');
        if (fullName) {
          await supabase.auth.updateUser({ data: { full_name: fullName } });
        }
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert('Sign In Failed', err.message ?? 'Could not sign in with Apple.');
    } finally {
      setIsPending(false);
    }
  };

  return { signIn, isPending };
}
