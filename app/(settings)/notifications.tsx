import React from 'react';
import { View, Text, ScrollView, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Trophy, Heart, Target, Megaphone } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useNotificationSettings, useUpdateSettings } from '@/hooks/useSettings';
import type { UserSettings } from '@/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ToggleRow } from '@/components/ui/ToggleRow';

export default function NotificationSettingsScreen() {
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateSettings();

  const toggle = (key: keyof UserSettings, value: boolean) => {
    updateSettings.mutate({ [key]: value } as Partial<UserSettings>);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Notifications" />
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Challenge Updates */}
        <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-6 mb-3">
          Challenge Updates
        </Text>
        <ToggleRow
          icon={<Bell size={20} color={Colors.neutralDark} />}
          label="New Invites"
          description="When friends invite you to a challenge."
          value={settings?.notification_new_invites ?? true}
          onValueChange={(v) => toggle('notification_new_invites', v)}
        />
        <ToggleRow
          icon={<Trophy size={20} color={Colors.neutralDark} />}
          label="Leaderboard Changes"
          description="Alerts when your rank changes."
          value={settings?.notification_leaderboard ?? true}
          onValueChange={(v) => toggle('notification_leaderboard', v)}
        />

        {/* Activity Nudges */}
        <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-6 mb-3">
          Activity Nudges
        </Text>
        <ToggleRow
          icon={<Heart size={20} color={Colors.neutralDark} />}
          label="Cheers & Nudges"
          description="When friends interact with your progress."
          value={settings?.notification_cheers ?? true}
          onValueChange={(v) => toggle('notification_cheers', v)}
        />

        {/* Goal Milestones */}
        <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-6 mb-3">
          Goal Milestones
        </Text>
        <ToggleRow
          icon={<Target size={20} color={Colors.neutralDark} />}
          label="Goal Achievements"
          description="Celebrate hitting your step goals."
          value={settings?.notification_goals ?? true}
          onValueChange={(v) => toggle('notification_goals', v)}
        />

        {/* General */}
        <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mt-6 mb-3">
          General
        </Text>
        <ToggleRow
          icon={<Megaphone size={20} color={Colors.neutralDark} />}
          label="App Announcements"
          description="New features and community news."
          value={settings?.notification_announcements ?? false}
          onValueChange={(v) => toggle('notification_announcements', v)}
        />

        {/* System Settings Link */}
        <Pressable
          onPress={() => Linking.openSettings()}
          className="mt-6 mb-8 items-center"
        >
          <Text className="text-xs text-muted-text">
            Looking for system-level settings?{' '}
            <Text className="text-neutral-dark font-semibold underline">
              Open System Settings
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
