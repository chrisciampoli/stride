import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

export function useConnectOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('connect-onboarding', {
        body: {},
      });

      if (error) {
        throw new Error(error.message || 'Failed to start onboarding');
      }

      // Open Stripe onboarding in browser
      await WebBrowser.openBrowserAsync(data.url);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeConnectAccount'] });
    },
  });
}
