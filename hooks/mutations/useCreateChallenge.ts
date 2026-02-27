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
}

export function useCreateChallenge() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      const startDate = new Date();
      const endDate = new Date();
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
          status: 'active',
          is_community: input.isCommunity ?? false,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator as a participant
      const { error: participantError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          user_id: user!.id,
          total_steps: 0,
        });

      if (participantError) throw participantError;

      // Invite friends by creating notifications
      if (input.invitedFriends?.length) {
        const notifications = input.invitedFriends.map((friendId) => ({
          user_id: friendId,
          type: 'challenge_invite' as const,
          title: 'Challenge Invite',
          body: `You've been invited to join "${input.name}"`,
          data: { challenge_id: challenge.id },
        }));

        await supabase.from('notifications').insert(notifications);
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
