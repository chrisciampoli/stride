import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Profile, FriendWithProfile } from '@/types';

interface FriendshipAsRequester {
  id: string;
  status: string;
  addressee: Profile;
}

interface FriendshipAsAddressee {
  id: string;
  status: string;
  requester: Profile;
}

export interface PendingRequest {
  id: string;
  friendship_id: string;
  profile: Profile;
}

export function useFriendsList(search?: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery<FriendWithProfile[]>({
    queryKey: ['friends', user?.id, search],
    queryFn: async () => {
      // Get friendships where current user is requester
      const { data: asRequester } = await supabase
        .from('friendships')
        .select('id, status, addressee:profiles!friendships_addressee_id_fkey(id, full_name, avatar_url, bio, location, created_at, updated_at)')
        .eq('requester_id', user!.id)
        .eq('status', 'accepted');

      // Get friendships where current user is addressee
      const { data: asAddressee } = await supabase
        .from('friendships')
        .select('id, status, requester:profiles!friendships_requester_id_fkey(id, full_name, avatar_url, bio, location, created_at, updated_at)')
        .eq('addressee_id', user!.id)
        .eq('status', 'accepted');

      const friends: FriendWithProfile[] = [
        ...((asRequester ?? []) as unknown as FriendshipAsRequester[]).map((f) => ({
          id: f.addressee.id,
          friendship_id: f.id,
          status: f.status,
          profile: f.addressee,
        })),
        ...((asAddressee ?? []) as unknown as FriendshipAsAddressee[]).map((f) => ({
          id: f.requester.id,
          friendship_id: f.id,
          status: f.status,
          profile: f.requester,
        })),
      ];

      if (search) {
        return friends.filter((f) =>
          f.profile.full_name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return friends;
    },
    enabled: !!user,
  });
}

export function usePendingRequests() {
  const user = useAuthStore((s) => s.user);

  return useQuery<PendingRequest[]>({
    queryKey: ['friends', 'pending', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, status, requester:profiles!friendships_requester_id_fkey(id, full_name, avatar_url, bio, location, created_at, updated_at)')
        .eq('addressee_id', user!.id)
        .eq('status', 'pending');

      if (error) throw error;
      return ((data ?? []) as unknown as FriendshipAsAddressee[]).map((f) => ({
        id: f.requester.id,
        friendship_id: f.id,
        profile: f.requester,
      }));
    },
    enabled: !!user,
  });
}

export function useOutgoingRequests() {
  const user = useAuthStore((s) => s.user);

  return useQuery<string[]>({
    queryKey: ['friends', 'outgoing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('addressee_id')
        .eq('requester_id', user!.id)
        .eq('status', 'pending');

      if (error) throw error;
      return (data ?? []).map((r) => r.addressee_id);
    },
    enabled: !!user,
  });
}

export function useFriendProfile(id: string) {
  return useQuery<Profile>({
    queryKey: ['friend', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!id,
  });
}
