import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
  textColor?: string;
}

export default function ErrorRetry({
  message = "Something went wrong",
  onRetry,
  textColor = "white"
}: ErrorRetryProps) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className={`text-${textColor}/60 text-center mb-4`}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        className="bg-white/10 rounded-xl px-6 py-3 border border-white/20"
      >
        <Text className={`text-${textColor} font-semibold`}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}