import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PrizeDistribution } from '@/types';

export function usePrizeDistributions(challengeId: string) {
  return useQuery<PrizeDistribution[]>({
    queryKey: ['prizeDistributions', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prize_distributions')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('place', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!challengeId,
  });
}
