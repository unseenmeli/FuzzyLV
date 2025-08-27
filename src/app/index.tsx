import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function index() {
  const [count, setCount] = useState(0);
  return (
    <View className="flex-1 justify-center items-center flex-col gap-5">
      <Text className="text-5xl font-bold">Counter: {count}</Text>
      <TouchableOpacity
        className="bg-blue-500 px-16 py-8 rounded-xl"
        onPress={() => {
          setCount(count + 1);
        }}
      >
        <Text className="color-white font-bold text-xl">Click me</Text>
      </TouchableOpacity>
    </View>
  );
}
