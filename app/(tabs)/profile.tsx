import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, User, Bell, Watch, LogOut, Trash2, Shield, FileText, TrendingUp, Trophy, Zap, Wallet } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useUserStats } from '@/hooks/useProfile';
import { useUserBadges, useAllBadges } from '@/hooks/useBadges';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { BadgeIcon } from '@/components/ui/BadgeIcon';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

function formatSteps(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: stats, isPending: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats();
  const { data: userBadges = [], refetch: refetchUserBadges } = useUserBadges();
  const { data: allBadges = [] } = useAllBadges();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchUserBadges()]);
    setRefreshing(false);
  }, [refetchStats, refetchUserBadges]);

  const earnedSlugs = new Set(userBadges.map((ub) => ub.badge?.slug));
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  if (statsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Profile" showBack={false} />
        <LoadingState message="Loading profile..." />
      </SafeAreaView>
    );
  }

  if (statsError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Profile" showBack={false} />
        <ErrorState message="Could not load profile" onRetry={refetchStats} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Profile"
        showBack={false}
        rightIcon={<Settings size={20} color={Colors.neutralDark} />}
        onRightPress={() => router.push('/(settings)/notifications')}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Avatar Section */}
        <View className="items-center pt-6 pb-4">
          <Avatar
            uri={profile?.avatar_url}
            initials={profile?.full_name?.charAt(0) ?? '?'}
            size="xl"
            border="primary"
          />
          <Text className="text-xl font-bold text-neutral-dark mt-3">
            {profile?.full_name ?? 'User'}
          </Text>
          <Text className="text-xs text-muted-text mt-1">
            Member since {memberSince}
          </Text>
          {profile?.location && (
            <Text className="text-xs text-primary font-semibold mt-1 uppercase">
              {profile.location}
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        <View className="flex-row px-6 gap-3 mb-6">
          <StatCard
            icon={<TrendingUp size={18} color={Colors.neutralDark} />}
            value={formatSteps(stats?.totalSteps ?? 0)}
            label="Total Steps"
          />
          <StatCard
            icon={<Trophy size={18} color={Colors.neutralDark} />}
            value={`${stats?.challengesWon ?? 0}`}
            label="Challenges"
            highlight
          />
          <StatCard
            icon={<Zap size={18} color={Colors.neutralDark} />}
            value={formatSteps(stats?.bestDay ?? 0)}
            label="Best Day"
          />
        </View>

        {/* Badges Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="text-lg font-bold text-neutral-dark">
              Badges & Achievements
            </Text>
            <Pressable onPress={() => router.push('/badge')}>
              <Text className="text-xs font-bold text-muted-text uppercase">See All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {allBadges.slice(0, 6).map((badge) => (
              <BadgeIcon
                key={badge.id}
                icon={badge.icon}
                name={badge.name}
                earned={earnedSlugs.has(badge.slug)}
                onPress={() => router.push(`/badge/${badge.id}`)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Settings List */}
        <View className="px-6 mb-8">
          <SettingsRow
            icon={<Wallet size={20} color={Colors.neutralDark} />}
            label="Wallet"
            subtitle="PRIZE EARNINGS"
            onPress={() => router.push('/(settings)/wallet')}
          />
          <SettingsRow
            icon={<User size={20} color={Colors.neutralDark} />}
            label="Personal Info"
            onPress={() => router.push('/(settings)/edit-profile')}
          />
          <SettingsRow
            icon={<Bell size={20} color={Colors.neutralDark} />}
            label="Notifications"
            onPress={() => router.push('/(settings)/notifications')}
          />
          <SettingsRow
            icon={<Watch size={20} color={Colors.neutralDark} />}
            label="Connected Devices"
            subtitle="SYNCED 2M AGO"
            onPress={() => router.push('/(settings)/connected-devices')}
          />
          <SettingsRow
            icon={<Shield size={20} color={Colors.neutralDark} />}
            label="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync('https://chrisciampoli.github.io/stride/privacy.html')}
          />
          <SettingsRow
            icon={<FileText size={20} color={Colors.neutralDark} />}
            label="Terms of Service"
            onPress={() => WebBrowser.openBrowserAsync('https://chrisciampoli.github.io/stride/terms.html')}
          />
          <SettingsRow
            icon={<Trash2 size={20} color="#ef4444" />}
            label="Delete Account"
            destructive
            onPress={() => router.push('/(settings)/delete-account')}
          />
          <SettingsRow
            icon={<LogOut size={20} color="#ef4444" />}
            label="Logout"
            destructive
            onPress={handleLogout}
          />
        </View>

        {/* Bottom spacer for absolute-positioned tab bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
