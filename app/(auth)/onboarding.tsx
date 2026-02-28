import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  Footprints,
  Trophy,
  ArrowRight,
  Check,
  Users,
  AlertCircle,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useConnectAppleHealth } from '@/hooks/useHealthKit';
import { useUpdateSettings } from '@/hooks/useSettings';
import { useFeatured } from '@/hooks/useDiscoverChallenges';
import { useJoinChallenge } from '@/hooks/mutations/useJoinChallenge';
import type { Challenge } from '@/types';

const STEP_COUNT = 3;

const PRESET_GOALS = [5000, 7500, 10000, 15000] as const;

function ProgressDots({ current }: { current: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2 py-4">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${
            i === current ? 'w-8 bg-primary' : 'w-2 bg-border'
          }`}
        />
      ))}
    </View>
  );
}

function StepHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View className="items-center mb-8">
      <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
        {icon}
      </View>
      <Text className="text-3xl font-bold text-neutral-dark text-center mb-2">
        {title}
      </Text>
      <Text className="text-base text-muted-text text-center leading-6 px-4">
        {description}
      </Text>
    </View>
  );
}

// Step 1: Connect HealthKit
function ConnectHealthKitStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const connectHealth = useConnectAppleHealth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connectHealth.mutateAsync();
      setConnected(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect HealthKit';
      setError(message);
    }
  };

  return (
    <View className="flex-1">
      <StepHeader
        icon={<Heart size={32} color={Colors.primary} strokeWidth={2} />}
        title="Track Your Steps"
        description="Connect Apple Health to automatically sync your daily steps"
      />

      <View className="flex-1 justify-center px-4">
        {connected ? (
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center">
              <Check size={28} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text className="text-lg font-semibold text-neutral-dark">
              HealthKit Connected
            </Text>
            <Text className="text-sm text-muted-text text-center">
              Your steps will sync automatically
            </Text>
          </View>
        ) : (
          <View className="items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleConnect}
              disabled={connectHealth.isPending}
            >
              {connectHealth.isPending ? 'Connecting...' : 'Connect HealthKit'}
            </Button>

            {error && (
              <View className="flex-row items-start gap-2 px-2">
                <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                <Text className="text-sm text-red-500 flex-1">{error}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View className="px-4 pb-4">
        {connected ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            iconRight={
              <ArrowRight size={20} color={Colors.neutralDark} strokeWidth={2.5} />
            }
            onPress={onNext}
          >
            Continue
          </Button>
        ) : (
          <Pressable onPress={onNext} className="py-4">
            <Text className="text-center text-muted-text text-base font-medium">
              Skip
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Step 2: Set Step Goal
function SetGoalStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const updateSettings = useUpdateSettings();
  const [selectedGoal, setSelectedGoal] = useState<number>(10000);
  const [customGoal, setCustomGoal] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const activeGoal = isCustom
    ? parseInt(customGoal, 10) || 0
    : selectedGoal;

  const handleContinue = async () => {
    if (activeGoal < 1000) return;
    try {
      await updateSettings.mutateAsync({ daily_step_goal: activeGoal });
    } catch {
      // Still advance even if update fails — goal can be changed later
    }
    onNext();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View className="flex-1">
      <StepHeader
        icon={<Footprints size={32} color={Colors.primary} strokeWidth={2} />}
        title="Set Your Daily Goal"
        description="Choose a daily step goal that challenges you"
      />

      <View className="flex-1 px-4">
        {/* Preset buttons */}
        <View className="flex-row flex-wrap gap-3 justify-center mb-6">
          {PRESET_GOALS.map((goal) => {
            const active = !isCustom && selectedGoal === goal;
            return (
              <Pressable
                key={goal}
                onPress={() => {
                  setSelectedGoal(goal);
                  setIsCustom(false);
                }}
                className={`px-5 py-4 rounded-xl border ${
                  active
                    ? 'bg-primary border-primary'
                    : 'bg-white border-border'
                }`}
                style={
                  !active
                    ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-lg font-bold text-center ${
                    active ? 'text-neutral-dark' : 'text-neutral-dark'
                  }`}
                >
                  {goal.toLocaleString()}
                </Text>
                <Text
                  className={`text-xs text-center mt-0.5 ${
                    active ? 'text-neutral-dark/70' : 'text-muted-text'
                  }`}
                >
                  steps
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom input */}
        <Pressable
          onPress={() => setIsCustom(true)}
          className={`rounded-xl border px-4 py-3 flex-row items-center ${
            isCustom ? 'border-primary bg-white' : 'border-border bg-white'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text className="text-sm text-muted-text font-medium mr-3">
            Custom:
          </Text>
          <TextInput
            className="flex-1 text-lg font-bold text-neutral-dark"
            placeholder="Enter goal"
            placeholderTextColor={Colors.mutedText}
            keyboardType="number-pad"
            value={customGoal}
            onChangeText={(text) => {
              setCustomGoal(text.replace(/[^0-9]/g, ''));
              setIsCustom(true);
            }}
            onFocus={() => setIsCustom(true)}
          />
          <Text className="text-sm text-muted-text font-medium ml-2">
            steps
          </Text>
        </Pressable>

        {/* Current selection display */}
        {activeGoal > 0 && (
          <View className="items-center mt-6">
            <Text className="text-muted-text text-sm">Your daily goal</Text>
            <Text className="text-4xl font-bold text-primary mt-1">
              {activeGoal.toLocaleString()}
            </Text>
            <Text className="text-muted-text text-sm">steps per day</Text>
          </View>
        )}
      </View>

      <View className="px-4 pb-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          iconRight={
            <ArrowRight size={20} color={Colors.neutralDark} strokeWidth={2.5} />
          }
          onPress={handleContinue}
          disabled={activeGoal < 1000 || updateSettings.isPending}
        >
          {updateSettings.isPending ? 'Saving...' : 'Continue'}
        </Button>

        <Pressable onPress={onNext} className="py-4">
          <Text className="text-center text-muted-text text-base font-medium">
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}

// Step 3: Join Challenge
function JoinChallengeStep({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { data: featured, isLoading } = useFeatured();
  const joinChallenge = useJoinChallenge();
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const handleJoin = async (challenge: Challenge) => {
    if (challenge.is_paid) return; // Skip paid challenges in onboarding
    try {
      await joinChallenge.mutateAsync(challenge.id);
      setJoinedIds((prev) => new Set(prev).add(challenge.id));
    } catch {
      // Silently handle — user can join later
    }
  };

  return (
    <View className="flex-1">
      <StepHeader
        icon={<Trophy size={32} color={Colors.primary} strokeWidth={2} />}
        title="Join Your First Challenge"
        description="Compete with others to stay motivated"
      />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : featured && featured.length > 0 ? (
          <View className="gap-4">
            {featured.map((challenge) => {
              const joined = joinedIds.has(challenge.id);
              const participantCount =
                challenge.challenge_participants?.[0]?.count ?? 0;

              return (
                <View
                  key={challenge.id}
                  className="bg-white rounded-2xl p-4 border border-border"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-lg font-bold text-neutral-dark">
                        {challenge.icon} {challenge.name}
                      </Text>
                      {challenge.description && (
                        <Text
                          className="text-sm text-muted-text mt-1"
                          numberOfLines={2}
                        >
                          {challenge.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center gap-1.5">
                      <Users size={14} color={Colors.mutedText} strokeWidth={2} />
                      <Text className="text-sm text-muted-text">
                        {participantCount}{' '}
                        {participantCount === 1 ? 'participant' : 'participants'}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-muted-text">
                        {challenge.goal_steps.toLocaleString()} steps
                      </Text>
                      <Text className="text-xs text-muted-text">
                        {challenge.duration_days}d
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3">
                    {joined ? (
                      <View className="bg-primary/10 rounded-xl h-12 items-center justify-center flex-row gap-2">
                        <Check
                          size={18}
                          color={Colors.primary}
                          strokeWidth={2.5}
                        />
                        <Text className="text-primary font-bold text-sm uppercase tracking-wider">
                          Joined
                        </Text>
                      </View>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onPress={() => handleJoin(challenge)}
                        disabled={
                          joinChallenge.isPending || challenge.is_paid
                        }
                      >
                        {joinChallenge.isPending ? 'Joining...' : 'Join Challenge'}
                      </Button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center py-12">
            <Text className="text-muted-text text-base text-center">
              No challenges available right now.{'\n'}You can browse challenges
              later.
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="px-4 pb-4 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          iconRight={
            <ArrowRight size={20} color={Colors.neutralDark} strokeWidth={2.5} />
          }
          onPress={onComplete}
        >
          {joinedIds.size > 0 ? "Let's Go" : 'Get Started'}
        </Button>

        {joinedIds.size === 0 && (
          <Pressable onPress={onComplete} className="py-4">
            <Text className="text-center text-muted-text text-base font-medium">
              Skip
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const updateSettings = useUpdateSettings();

  const completeOnboarding = async () => {
    try {
      await updateSettings.mutateAsync({ onboarding_completed: true });
    } catch {
      // Even if the update fails, navigate away — they can be re-prompted later
    }
    router.replace('/(tabs)');
  };

  const nextStep = () => {
    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <ProgressDots current={step} />

      {step === 0 && <ConnectHealthKitStep onNext={nextStep} />}
      {step === 1 && <SetGoalStep onNext={nextStep} />}
      {step === 2 && <JoinChallengeStep onComplete={completeOnboarding} />}
    </SafeAreaView>
  );
}
