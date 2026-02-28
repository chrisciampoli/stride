import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-[#1A1208] px-6">
          <Text className="text-2xl font-bold text-white mb-3">
            Something went wrong
          </Text>
          <Text className="text-sm text-[#A07850] text-center mb-8">
            An unexpected error occurred. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-[#E85D0A] rounded-xl px-8 py-4"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
