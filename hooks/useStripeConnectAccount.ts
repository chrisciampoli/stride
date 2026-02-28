import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { StripeConnectAccount } from '@/types';

export function useStripeConnectAccount() {
  const user = useAuthStore((s) => s.user);

  return useQuery<StripeConnectAccount | null>({
    queryKey: ['stripeConnectAccount', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
