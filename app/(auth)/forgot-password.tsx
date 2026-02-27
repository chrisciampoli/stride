import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'strideapp://reset-password',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 px-8 justify-center">
          <Text className="text-3xl font-bold text-neutral-dark mb-2">
            Check your email
          </Text>
          <Text className="text-lg text-neutral-muted mb-10">
            We sent a password reset link to your email. Tap the link to set a
            new password.
          </Text>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            Back to Sign In
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
        <View className="flex-1 px-8 pt-16 justify-center">
          <Text className="text-3xl font-bold text-neutral-dark mb-2">
            Reset password
          </Text>
          <Text className="text-lg text-neutral-muted mb-10">
            Enter your email and we'll send you a link to reset your password
          </Text>

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
          </View>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <Text className="text-center mt-6 text-neutral-muted">
            Remember your password?{' '}
            <Text
              className="text-neutral-dark font-bold"
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              Sign In
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
