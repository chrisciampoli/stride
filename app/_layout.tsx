import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { stripePublishableKey } from '@/lib/stripe';
import { useAuthStore } from '@/stores/authStore';
import { useRegisterPushOnAuth, usePushNotificationListeners } from '@/hooks/usePushNotifications';
import { Toast } from '@/components/ui/Toast';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/(auth)/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Push notifications
  useRegisterPushOnAuth();
  usePushNotificationListeners();

  return <>{children}</>;
}

export default function RootLayout() {
  const { setSession, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) fetchProfile();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile();
      } else {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(challenge)" />
            <Stack.Screen name="(social)" />
            <Stack.Screen name="(settings)" />
            <Stack.Screen name="badge/[id]" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
        <Toast />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </StripeProvider>
  );
}
