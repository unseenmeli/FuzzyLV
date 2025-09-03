import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    try {
      router.replace('/');
    } catch (navError) {
      console.error('Navigation error:', navError);
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-blue-900 justify-center items-center p-6">
          <Text className="text-white text-2xl font-bold mb-4">Oops!</Text>
          <Text className="text-white/80 text-center mb-6">
            Something went wrong. Let's get you back on track.
          </Text>
          <TouchableOpacity
            onPress={this.resetError}
            className="bg-white/20 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">Go to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}