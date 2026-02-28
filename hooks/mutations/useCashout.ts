import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCashout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountCents: number) => {
      const { data, error } = await supabase.functions.invoke('process-cashout', {
        body: { amount_cents: amountCents },
      });

      if (error) {
        throw new Error(error.message || 'Cashout failed');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
  });
}
