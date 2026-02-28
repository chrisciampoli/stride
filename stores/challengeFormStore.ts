import { create } from 'zustand';
import type { GoalType, PayoutTier } from '@/types';

interface ChallengeFormState {
  name: string;
  goalType: GoalType;
  goalSteps: number;
  durationDays: number;
  invitedFriends: string[];
  isCommunity: boolean;
  isPaid: boolean;
  entryFeeCents: number;
  payoutStructure: PayoutTier[];
  minParticipants: number;
  setName: (name: string) => void;
  setGoalType: (goalType: GoalType) => void;
  setGoalSteps: (goalSteps: number) => void;
  setDurationDays: (durationDays: number) => void;
  toggleFriend: (friendId: string) => void;
  setIsCommunity: (isCommunity: boolean) => void;
  setIsPaid: (isPaid: boolean) => void;
  setEntryFeeCents: (entryFeeCents: number) => void;
  setPayoutStructure: (payoutStructure: PayoutTier[]) => void;
  setMinParticipants: (minParticipants: number) => void;
  reset: () => void;
}

const initialState = {
  name: '',
  goalType: 'total_steps' as GoalType,
  goalSteps: 10000,
  durationDays: 7,
  invitedFriends: [] as string[],
  isCommunity: false,
  isPaid: false,
  entryFeeCents: 500, // $5 default per behavioural analysis
  payoutStructure: [{ place: 1, pct: 100 }] as PayoutTier[], // winner-take-all default
  minParticipants: 0,
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
  setIsPaid: (isPaid) => set({ isPaid }),
  setEntryFeeCents: (entryFeeCents) => set({ entryFeeCents }),
  setPayoutStructure: (payoutStructure) => set({ payoutStructure }),
  setMinParticipants: (minParticipants) => set({ minParticipants }),
  reset: () => set(initialState),
}));
