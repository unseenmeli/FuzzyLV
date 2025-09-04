import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { GradientBackground, themes } from '@/utils/shared';

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  
  // Try to detect if navigation is ready
  try {
    const navigationState = useNavigationState(state => state);
    
    useEffect(() => {
      // Navigation is ready if we can get state
      if (navigationState) {
        setIsReady(true);
      }
    }, [navigationState]);
  } catch (error) {
    // Navigation not ready yet
    useEffect(() => {
      // Fallback: just wait a bit for navigation to be ready
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }, []);
  }

  if (!isReady) {
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading...</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}