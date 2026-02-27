import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AuthSession, AuthUser, Profile } from '@/types';

interface AuthState {
  session: AuthSession;
  user: AuthUser;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  setLoading: (isLoading: boolean) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      set({ profile: null });
      return;
    }

    set({ profile: data });
  },
}));
