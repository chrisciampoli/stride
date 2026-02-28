import type { Session, User } from '@supabase/supabase-js';

export type AuthSession = Session | null;
export type AuthUser = User | null;

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export type ChallengeStatus = 'active' | 'upcoming' | 'completed' | 'tiebreaker' | 'cancelled';

export type PrizeStatus = 'none' | 'collecting' | 'funded' | 'distributing' | 'distributed' | 'refunding' | 'refunded';

export type PaymentStatus = 'none' | 'pending' | 'paid' | 'refunded';

export type WalletTransactionType = 'prize_won' | 'entry_fee' | 'cashout' | 'refund' | 'cashout_reversal';

export interface PayoutTier {
  place: number;
  pct: number;
}
export type TabName = 'index' | 'challenges' | 'friends' | 'profile';

export type GoalType = 'total_steps' | 'daily_average';

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  cover_image_url: string | null;
  goal_steps: number;
  goal_type: GoalType;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  created_by: string | null;
  is_community: boolean;
  category: string | null;
  entry_fee_cents: number;
  is_paid: boolean;
  prize_pool_cents: number;
  payout_structure: PayoutTier[];
  min_participants: number;
  prize_status: PrizeStatus;
  tiebreaker_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  total_steps: number;
  joined_at: string;
  payment_intent_id: string | null;
  payment_status: PaymentStatus;
  paid_amount_cents: number;
  refund_id: string | null;
  profile?: Profile;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export type MessageType = 'text' | 'activity_share' | 'challenge_invite' | 'nudge';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type BadgeRequirementType =
  | 'total_distance'
  | 'streak_days'
  | 'challenges_won'
  | 'total_steps'
  | 'custom';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string | null;
  requirement_type: BadgeRequirementType;
  requirement_value: number | null;
  xp_reward: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  progress: number;
  badge?: Badge;
}

export type NotificationType =
  | 'challenge_invite'
  | 'challenge_started'
  | 'challenge_completed'
  | 'rank_change'
  | 'friend_request'
  | 'friend_accepted'
  | 'nudge'
  | 'badge_earned'
  | 'goal_reached'
  | 'announcement';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  notification_new_invites: boolean;
  notification_leaderboard: boolean;
  notification_cheers: boolean;
  notification_goals: boolean;
  notification_announcements: boolean;
  connected_device: string | null;
  device_last_synced_at: string | null;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_streak_date: string | null;
  daily_step_goal: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyStats {
  steps: number;
  goal: number;
  calories: number;
  miles: number;
  activeMinutes: number;
}

export interface DailyStepRecord {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  calories: number;
  distance_miles: number;
  active_minutes: number;
  created_at: string;
}

export interface FriendWithProfile {
  id: string;
  friendship_id: string;
  status: string;
  profile: Profile;
}

export type HealthKitStatus = 'not_determined' | 'authorized' | 'denied' | 'unavailable';

export interface HealthKitDailyData {
  date: string; // 'YYYY-MM-DD'
  steps: number;
  calories: number;
  distanceMiles: number;
  activeMinutes: number;
}

export interface HealthSyncResult {
  success: boolean;
  daysUpserted: number;
  error?: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  error?: string;
}

export interface ProfileUpdateInput {
  full_name?: string;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_streak_date: string | null;
  daily_step_goal: number;
}

// Prize Pool Types

export interface Wallet {
  id: string;
  user_id: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: WalletTransactionType;
  amount_cents: number;
  description: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface StripeConnectAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  friendId: string;
  friendName: string;
  friendAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageType: MessageType;
  isLastMessageSent: boolean;
}

export interface PrizeDistribution {
  id: string;
  challenge_id: string;
  user_id: string;
  place: number;
  amount_cents: number;
  transfer_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}
