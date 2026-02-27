import { create } from 'zustand';
import type { GoalType } from '@/types';

interface ChallengeFormState {
  name: string;
  goalType: GoalType;
  goalSteps: number;
  durationDays: number;
  invitedFriends: string[];
  isCommunity: boolean;
  setName: (name: string) => void;
  setGoalType: (goalType: GoalType) => void;
  setGoalSteps: (goalSteps: number) => void;
  setDurationDays: (durationDays: number) => void;
  toggleFriend: (friendId: string) => void;
  setIsCommunity: (isCommunity: boolean) => void;
  reset: () => void;
}

const initialState = {
  name: '',
  goalType: 'total_steps' as GoalType,
  goalSteps: 10000,
  durationDays: 7,
  invitedFriends: [] as string[],
  isCommunity: false,
};

export const useChallengeFormStore = create<ChallengeFormState>((set) => ({
  ...initialState,
  setName: (name) => set({ name }),
  setGoalType: (goalType) => set({ goalType }),
  setGoalSteps: (goalSteps) => set({ goalSteps }),
  setDurationDays: (durationDays) => set({ durationDays }),
  toggleFriend: (friendId) =>
    set((state) => ({
      invitedFriends: state.invitedFriends.includes(friendId)
        ? state.invitedFriends.filter((id) => id !== friendId)
        : [...state.invitedFriends, friendId],
    })),
  setIsCommunity: (isCommunity) => set({ isCommunity }),
  reset: () => set(initialState),
}));
