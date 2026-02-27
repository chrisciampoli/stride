import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDeleteAccount } from '@/hooks/mutations/useDeleteAccount';

export default function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState('');
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const isConfirmed = confirmation === 'DELETE';

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => deleteAccount(),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Delete Account" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
              <AlertTriangle size={32} color="#ef4444" />
            </View>
            <Text className="text-xl font-bold text-neutral-dark text-center">
              Are you sure?
            </Text>
          </View>

          <View className="bg-red-50 rounded-xl p-4 mb-6">
            <Text className="text-sm text-red-800 leading-5">
              Deleting your account will permanently remove:{'\n\n'}
              • Your profile and avatar{'\n'}
              • All challenge participation and progress{'\n'}
              • Your friends list and messages{'\n'}
              • All badges and achievements{'\n'}
              • Your step history and statistics{'\n\n'}
              This action cannot be undone.
            </Text>
          </View>

          <Text className="text-sm font-semibold text-neutral-dark/70 uppercase tracking-wider ml-1 mb-2">
            Type "DELETE" to confirm
          </Text>
          <Input
            placeholder="DELETE"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View className="mt-6">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleDelete}
              disabled={!isConfirmed || isPending}
            >
              {isPending ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
