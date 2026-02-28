import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface CreateChallengeInput {
  name: string;
  goalSteps: number;
  goalType: 'total_steps' | 'daily_average';
  durationDays: number;
  invitedFriends?: string[];
  isCommunity?: boolean;
  isPaid?: boolean;
  entryFeeCents?: number;
  payoutStructure?: Array<{ place: number; pct: number }>;
  minParticipants?: number;
}

export function useCreateChallenge() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      const isPaid = input.isPaid ?? false;

      // Paid challenges get a 48h registration window before starting
      const startDate = new Date();
      if (isPaid) {
        startDate.setHours(startDate.getHours() + 48);
      }
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + input.durationDays);

      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert({
          name: input.name,
          goal_steps: input.goalSteps,
          goal_type: input.goalType,
          duration_days: input.durationDays,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: isPaid ? 'upcoming' : 'active',
          is_community: input.isCommunity ?? false,
          created_by: user!.id,
          is_paid: isPaid,
          entry_fee_cents: isPaid ? (input.entryFeeCents ?? 500) : 0,
          payout_structure: isPaid ? (input.payoutStructure ?? [{ place: 1, pct: 100 }]) : [],
          min_participants: isPaid ? (input.minParticipants ?? 0) : 0,
          prize_status: isPaid ? 'collecting' : 'none',
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join creator for free challenges only.
      // Paid challenge creators join via payment flow (create-payment-intent).
      if (!isPaid) {
        const { error: participantError } = await supabase
          .from('challenge_participants')
          .upsert(
            { challenge_id: challenge.id, user_id: user!.id, total_steps: 0 },
            { onConflict: 'challenge_id,user_id' },
          );

        if (participantError) {
          console.warn('Failed to auto-join challenge:', participantError.message);
        }
      }

      // Invite friends by creating notification rows directly (fire-and-forget)
      if (input.invitedFriends?.length) {
        try {
          const notifications = input.invitedFriends.map((friendId) => ({
            user_id: friendId,
            type: 'challenge_invite' as const,
            title: 'Challenge Invite',
            body: `You've been invited to join "${input.name}"`,
            data: { sender_id: user!.id, challenge_id: challenge.id },
          }));

          await supabase.from('notifications').insert(notifications);
        } catch (e) {
          console.warn('Failed to send challenge invites:', e);
        }
      }

      return challenge;
    },
    onSuccess: (challenge) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challenge.id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', challenge.id] });
      queryClient.invalidateQueries({ queryKey: ['homeCTA'] });
      queryClient.invalidateQueries({ queryKey: ['homeLeaderboard'] });
    },
  });
}
