import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCashout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountCents: number) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-cashout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount_cents: amountCents }),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Cashout failed');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
  });
}
