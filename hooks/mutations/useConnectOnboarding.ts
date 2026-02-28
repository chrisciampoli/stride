import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

export function useConnectOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/connect-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start onboarding');
      }

      // Open Stripe onboarding in browser
      await WebBrowser.openBrowserAsync(result.url);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeConnectAccount'] });
    },
  });
}
