import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { WalletTransaction } from '@/types';

export function useWalletTransactions() {
  const user = useAuthStore((s) => s.user);

  return useQuery<WalletTransaction[]>({
    queryKey: ['walletTransactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
