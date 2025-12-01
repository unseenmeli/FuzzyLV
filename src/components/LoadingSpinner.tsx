import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { BlurView } from "expo-blur";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  size?: "small" | "large";
  color?: string;
}

export default function LoadingSpinner({
  message = "Loading...",
  fullScreen = false,
  overlay = false,
  size = "large",
  color = "#FFFFFF",
}: LoadingSpinnerProps) {
  const content = (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-white mt-3 text-center">{message}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 absolute inset-0 z-50">
        {overlay ? (
          <BlurView intensity={80} tint="dark" className="flex-1">
            <View className="flex-1 items-center justify-center">
              {content}
            </View>
          </BlurView>
        ) : (
          <View className="flex-1 items-center justify-center bg-black/50">
            {content}
          </View>
        )}
      </View>
    );
  }

  return content;
}