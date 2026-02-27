import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <AlertTriangle size={40} color={Colors.neutralMuted} />
      <Text className="text-sm text-muted-text mt-4 text-center">{message}</Text>
      {onRetry && (
        <View className="mt-4">
          <Button variant="secondary" size="sm" onPress={onRetry}>
            Try Again
          </Button>
        </View>
      )}
    </View>
  );
}
