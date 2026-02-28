import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { useAppleAuth } from '@/hooks/useAppleAuth';
import { supabase } from '@/lib/supabase';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const appleAuth = useAppleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignInForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Alert.alert(
        'Sign In Failed',
        'Invalid email or password. Forgot your password?',
        [
          { text: 'Try Again', style: 'cancel' },
          {
            text: 'Reset Password',
            onPress: () => router.push('/(auth)/forgot-password'),
          },
        ],
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-8 pt-16 justify-center">
          <Text className="text-3xl font-bold text-neutral-dark mb-2">
            Welcome back
          </Text>
          <Text className="text-lg text-neutral-muted mb-10">
            Sign in to continue your journey
          </Text>

          <AppleSignInButton onPress={appleAuth.signIn} disabled={appleAuth.isPending} />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-xs text-muted-text uppercase">or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <View className="gap-4 mb-8">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  placeholder="Your password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />
          </View>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Text
            className="text-center mt-4 text-primary font-semibold"
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            Forgot Password?
          </Text>

          <Text className="text-center mt-4 text-neutral-muted">
            Don't have an account?{' '}
            <Text
              className="text-neutral-dark font-bold"
              onPress={() => router.replace('/(auth)/sign-up')}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
