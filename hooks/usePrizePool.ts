import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PayoutTier, PrizeStatus } from '@/types';

interface PrizePoolDetails {
  entryFeeCents: number;
  prizePoolCents: number;
  payoutStructure: PayoutTier[];
  prizeStatus: PrizeStatus;
  minParticipants: number;
  paidParticipantCount: number;
  tiebreakerEndDate: string | null;
}

export function usePrizePool(challengeId: string) {
  return useQuery<PrizePoolDetails | null>({
    queryKey: ['prizePool', challengeId],
    queryFn: async () => {
      const { data: challenge, error } = await supabase
        .from('challenges')
        .select('entry_fee_cents, prize_pool_cents, payout_structure, prize_status, min_participants, tiebreaker_end_date, is_paid')
        .eq('id', challengeId)
        .single();

      if (error) throw error;
      if (!challenge?.is_paid) return null;

      // Count paid participants
      const { count } = await supabase
        .from('challenge_participants')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('payment_status', 'paid');

      return {
        entryFeeCents: challenge.entry_fee_cents,
        prizePoolCents: challenge.prize_pool_cents,
        payoutStructure: challenge.payout_structure as PayoutTier[],
        prizeStatus: challenge.prize_status as PrizeStatus,
        minParticipants: challenge.min_participants,
        paidParticipantCount: count ?? 0,
        tiebreakerEndDate: challenge.tiebreaker_end_date,
      };
    },
    enabled: !!challengeId,
  });
}
