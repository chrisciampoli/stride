import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

const signUpSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

function getSignUpErrorMessage(message: string): string {
  if (message.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  return 'Something went wrong. Please try again.';
}

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const appleAuth = useAppleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignUpForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Error', getSignUpErrorMessage(error.message));
      return;
    }

    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 px-8 justify-center">
          <Text className="text-3xl font-bold text-neutral-dark mb-2">
            Check your email
          </Text>
          <Text className="text-lg text-neutral-muted mb-10">
            We sent a confirmation link to your email address. Tap the link to
            activate your account, then come back to sign in.
          </Text>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            Go to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-8 pt-16 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-3xl font-bold text-neutral-dark mb-2">
            Create account
          </Text>
          <Text className="text-lg text-neutral-muted mb-10">
            Start your fitness challenge today
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
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={errors.fullName?.message}
                />
              )}
            />

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
                  placeholder="Create a password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.confirmPassword?.message}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Text className="text-center mt-6 text-neutral-muted">
            Already have an account?{' '}
            <Text
              className="text-neutral-dark font-bold"
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              Sign In
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
