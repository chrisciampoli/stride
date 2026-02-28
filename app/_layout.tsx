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
import { useNotificationSettings } from '@/hooks/useSettings';
import { useRegisterPushOnAuth, usePushNotificationListeners } from '@/hooks/usePushNotifications';
import { Toast } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { data: settings, isLoading: settingsLoading } = useNotificationSettings();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboardingScreen = segments[1] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
    } else if (session && inAuthGroup && !onOnboardingScreen) {
      // Authenticated user on a non-onboarding auth screen — check onboarding status
      if (!settingsLoading && settings && !settings.onboarding_completed) {
        router.replace('/(auth)/onboarding');
      } else if (!settingsLoading) {
        router.replace('/(tabs)');
      }
    } else if (session && !inAuthGroup && !settingsLoading && settings && !settings.onboarding_completed) {
      // Authenticated user outside auth group who hasn't completed onboarding
      router.replace('/(auth)/onboarding');
    }
  }, [session, isLoading, segments, settings, settingsLoading]);

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
    <StripeProvider
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.allenfootrace.app"
      urlScheme="strideapp"
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
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
        </ErrorBoundary>
        <Toast />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </StripeProvider>
  );
}
