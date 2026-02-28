import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, UserPlus, Check, X, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useFriendsList, usePendingRequests, useOutgoingRequests } from '@/hooks/useFriends';
import { useAcceptFriendRequest, useRejectFriendRequest } from '@/hooks/mutations/useFriendActions';
import { useSendFriendRequest } from '@/hooks/mutations/useFriendActions';
import { useFriendsWeeklySteps } from '@/hooks/useWeeklySteps';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchUsers } from '@/hooks/useSearchUsers';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import type { Profile } from '@/types';

export default function FriendsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  const { data: friends = [], isPending: friendsLoading, isError: friendsError, refetch: refetchFriends } = useFriendsList(search || undefined);
  const { data: pendingRequests = [], refetch: refetchPending } = usePendingRequests();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFriends(), refetchPending()]);
    setRefreshing(false);
  }, [refetchFriends, refetchPending]);
  const { data: outgoingIds = [] } = useOutgoingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const sendRequest = useSendFriendRequest();
  const friendIds = friends.map((f) => f.id);
  const { data: weeklySteps = {} } = useFriendsWeeklySteps(friendIds);

  const { data: searchResults = [], isFetching: isSearchFetching } = useSearchUsers(debouncedQuery);

  // Build exclusion set: existing friends + incoming pending + outgoing pending
  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    friends.forEach((f) => ids.add(f.id));
    pendingRequests.forEach((r) => ids.add(r.id));
    outgoingIds.forEach((id) => ids.add(id));
    return ids;
  }, [friends, pendingRequests, outgoingIds]);

  const filteredResults = useMemo(
    () => searchResults.filter((p) => !excludeIds.has(p.id)),
    [searchResults, excludeIds],
  );

  function handleToggleSearch() {
    if (isSearching) {
      setIsSearching(false);
      setSearchQuery('');
      setSentRequestIds(new Set());
    } else {
      setIsSearching(true);
    }
  }

  function handleSendRequest(userId: string) {
    setSentRequestIds((prev) => new Set(prev).add(userId));
    sendRequest.mutate(userId);
  }

  function renderSearchResult({ item }: { item: Profile }) {
    const isPending = sentRequestIds.has(item.id) || outgoingIds.includes(item.id);
    return (
      <View className="flex-row items-center py-3 bg-white rounded-xl px-4 mb-2 mx-6">
        <Avatar
          uri={item.avatar_url}
          initials={item.full_name?.charAt(0) ?? '?'}
          size="md"
        />
        <View className="flex-1 ml-3">
          <Text className="text-sm font-semibold text-neutral-dark">
            {item.full_name}
          </Text>
          {item.location && (
            <Text className="text-xs text-muted-text">{item.location}</Text>
          )}
        </View>
        {isPending ? (
          <View className="px-3 py-1.5 rounded-full bg-white border border-border">
            <Text className="text-xs font-medium text-muted-text">Pending</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => handleSendRequest(item.id)}
            className="px-3 py-1.5 rounded-full bg-primary"
          >
            <Text className="text-xs font-semibold text-neutral-dark">Add</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderSearchEmpty() {
    if (isSearchFetching) {
      return (
        <View className="py-12 items-center">
          <ActivityIndicator color={Colors.primary} />
        </View>
      );
    }
    if (debouncedQuery.length === 0) {
      return (
        <View className="py-12 items-center">
          <Text className="text-muted-text text-sm">Search for people by name</Text>
        </View>
      );
    }
    if (debouncedQuery.length < 2) {
      return (
        <View className="py-12 items-center">
          <Text className="text-muted-text text-sm">Type at least 2 characters</Text>
        </View>
      );
    }
    return (
      <View className="py-12 items-center">
        <Text className="text-muted-text text-sm">
          No users found matching &apos;{debouncedQuery}&apos;
        </Text>
      </View>
    );
  }

  // Search mode
  if (isSearching) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader
          title="Add Friend"
          showBack={false}
          rightIcon={<X size={20} color={Colors.neutralDark} />}
          onRightPress={handleToggleSearch}
        />
        <View className="px-6 pt-4 pb-3">
          <SearchBar
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          ListEmptyComponent={renderSearchEmpty}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  if (friendsLoading && !search) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Friends" showBack={false} />
        <View className="px-6 pt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (friendsError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Friends" showBack={false} />
        <ErrorState message="Could not load friends" onRetry={refetchFriends} />
      </SafeAreaView>
    );
  }

  // Normal friends view
  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Friends"
        showBack={false}
        rightIcon={<UserPlus size={20} color={Colors.neutralDark} />}
        onRightPress={handleToggleSearch}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Messages + Search */}
        <View className="px-6 pt-4 pb-3 flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar
              placeholder="Search friends..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable
            onPress={() => router.push('/(social)/inbox')}
            className="w-11 h-11 rounded-full bg-white items-center justify-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <MessageCircle size={20} color={Colors.neutralDark} />
          </Pressable>
        </View>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View className="px-6 mb-4">
            <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
              Pending Requests
            </Text>
            {pendingRequests.map((req) => (
              <View
                key={req.friendship_id}
                className="flex-row items-center py-3 bg-white rounded-xl px-4 mb-2"
              >
                <Avatar
                  uri={req.profile.avatar_url}
                  initials={req.profile.full_name?.charAt(0) ?? '?'}
                  size="md"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-neutral-dark">
                    {req.profile.full_name}
                  </Text>
                  <Text className="text-xs text-muted-text">Wants to be friends</Text>
                </View>
                <Pressable
                  onPress={() => acceptRequest.mutate(req.friendship_id)}
                  className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-2"
                >
                  <Check size={16} color={Colors.neutralDark} />
                </Pressable>
                <Pressable
                  onPress={() => rejectRequest.mutate(req.friendship_id)}
                  className="w-10 h-10 rounded-full bg-white border border-border items-center justify-center"
                >
                  <X size={16} color={Colors.neutralMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Friends List */}
        <View className="px-6">
          {friends.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-muted-text text-sm text-center">
                {search
                  ? 'No friends match your search'
                  : 'No friends yet.\nSearch for people above to add friends!'}
              </Text>
            </View>
          ) : (
            friends.map((friend) => (
              <Pressable
                key={friend.id}
                onPress={() => router.push(`/(social)/friend/${friend.id}`)}
                className="flex-row items-center py-3 bg-white rounded-xl px-4 mb-2"
              >
                <Avatar
                  uri={friend.profile.avatar_url}
                  initials={friend.profile.full_name?.charAt(0) ?? '?'}
                  size="md"
                  border="none"
                  showOnline
                />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-neutral-dark">
                    {friend.profile.full_name}
                  </Text>
                  <Text className="text-xs text-muted-text">
                    {(weeklySteps[friend.id] ?? 0).toLocaleString()} steps this week
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.neutralMuted} />
              </Pressable>
            ))
          )}
        </View>

        {/* Bottom spacer for absolute-positioned tab bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
