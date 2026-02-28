import { View, Text, type DimensionValue } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

function BarChart() {
  const bars: { height: DimensionValue; opacity: number }[] = [
    { height: '40%', opacity: 0.2 },
    { height: '55%', opacity: 0.3 },
    { height: '70%', opacity: 0.4 },
    { height: '100%', opacity: 0.6 },
    { height: '85%', opacity: 0.7 },
    { height: '60%', opacity: 0.85 },
    { height: '75%', opacity: 1 },
  ];

  return (
    <View className="flex-row items-end justify-center gap-2 h-32">
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{
            height: bar.height,
            opacity: bar.opacity,
            backgroundColor: Colors.primary,
            width: 8,
            borderRadius: 4,
          }}
        />
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-8 pt-12">
        {/* Brand header */}
        <View className="items-center mb-12">
          <View className="w-14 h-14 bg-primary rounded-xl items-center justify-center mb-3">
            <Zap size={28} color={Colors.neutralDark} strokeWidth={2.5} fill={Colors.neutralDark} />
          </View>
          <Text className="text-lg font-bold text-neutral-dark">Allen Footrace</Text>
        </View>

        {/* Hero text */}
        <View className="mb-6">
          <Text className="text-5xl font-bold text-neutral-dark leading-tight">
            Every Step
          </Text>
          <Text className="text-5xl font-bold text-primary leading-tight">
            Counts
          </Text>
        </View>

        {/* Subtitle */}
        <Text className="text-lg text-neutral-muted leading-7 mb-12">
          Join the challenge. Reach your{'\n'}peak performance today.
        </Text>

        {/* Bar chart visualization */}
        <BarChart />
      </View>

      {/* Bottom CTA */}
      <View className="px-8 pb-8">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          iconRight={
            <ArrowRight size={20} color={Colors.neutralDark} strokeWidth={2.5} />
          }
          onPress={() => router.push('/(auth)/sign-up')}
        >
          GET STARTED
        </Button>

        <Text className="text-center mt-4 text-neutral-muted">
          Already have an account?{' '}
          <Text
            className="text-neutral-dark font-bold"
            onPress={() => router.push('/(auth)/sign-in')}
          >
            Sign In
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
