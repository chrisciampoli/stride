import React from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Award, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useBadgeDetail, useUserBadgeForBadge, useAllBadges, useUserBadges } from '@/hooks/useBadges';
import { useShareBadge } from '@/hooks/useShareBadge';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ShareableBadgeCard } from '@/components/ui/ShareableBadgeCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonProfile, SkeletonCard } from '@/components/ui/SkeletonLoader';

export default function BadgeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: badge, isPending: badgeLoading, isError: badgeError, refetch: refetchBadge } = useBadgeDetail(id);
  const { data: userBadge } = useUserBadgeForBadge(id);
  const { data: allBadges = [] } = useAllBadges();
  const { data: userBadges = [] } = useUserBadges();

  const { viewRef, share } = useShareBadge();
  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));
  const unearnedBadges = allBadges.filter((b) => b.id !== id && !earnedBadgeIds.has(b.id)).slice(0, 3);

  if (badgeLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Badge Details" />
        <SkeletonProfile />
        <View className="px-6">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (badgeError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Badge Details" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[#1A1208] text-lg font-semibold mb-2">Something went wrong</Text>
          <Text className="text-[#A07850] text-center mb-4">Could not load badge details. Please try again.</Text>
          <TouchableOpacity onPress={() => refetchBadge()} className="bg-[#E85D0A] px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Badge Details" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Badge Hero — wrapped for share screenshot */}
        <View className="items-center pt-8 pb-6">
          <ShareableBadgeCard
            ref={viewRef}
            badgeName={badge?.name ?? 'Badge'}
            badgeDescription={badge?.description ?? ''}
            earnedDate={userBadge?.earned_at ?? null}
          />
          {!userBadge?.earned_at && (
            <Badge style="subtle">Not yet earned</Badge>
          )}
        </View>

        {/* Achievement Description */}
        <View className="px-6 mb-4">
          <Card>
            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3 mt-0.5">
                <Zap size={16} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-neutral-dark mb-1">
                  Achievement Unlocked
                </Text>
                <Text className="text-sm text-muted-text leading-5">
                  {badge?.description ?? 'Complete the requirements to earn this badge.'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Share Button */}
        <View className="px-6 mb-6">
          <Button variant="primary" size="md" fullWidth onPress={share}>
            ★ Share Achievement
          </Button>
        </View>

        {/* Next Milestones */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="text-lg font-bold text-neutral-dark">Next Milestones</Text>
            <Text className="text-xs font-bold text-muted-text uppercase">View All</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          >
            {unearnedBadges.map((milestone) => {
              const userProgress = userBadges.find((ub) => ub.badge_id === milestone.id);
              const progress = milestone.requirement_value
                ? (userProgress?.progress ?? 0) / milestone.requirement_value
                : 0;
              return (
                <Pressable key={milestone.id} onPress={() => router.push(`/badge/${milestone.id}`)}>
                  <View className="w-36 bg-white border border-border rounded-xl p-3">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                      <Award size={18} color={Colors.neutralMuted} />
                    </View>
                    <Text className="text-xs font-bold text-neutral-dark mb-0.5">{milestone.name}</Text>
                    <Text className="text-[10px] text-muted-text mb-2">
                      {milestone.requirement_value ? `Goal: ${milestone.requirement_value.toLocaleString()}` : milestone.description}
                    </Text>
                    <ProgressBar progress={Math.min(progress, 1)} height="thin" />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
