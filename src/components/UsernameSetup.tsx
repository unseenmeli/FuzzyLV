import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";

const generateFriendCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function UsernameSetup({ user }: { user: any }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetUsername = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      Alert.alert("Error", "Username must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert("Error", "Username can only contain letters, numbers, and underscores");
      return;
    }

    setLoading(true);

    try {
      let friendCode = generateFriendCode();

      const { data } = await db.queryOnce({
        profiles: { $: { where: { friendCode } } }
      });

      while (data?.profiles?.length > 0) {
        friendCode = generateFriendCode();
        const check = await db.queryOnce({
          profiles: { $: { where: { friendCode } } }
        });
        if (!check.data?.profiles?.length) break;
      }

      const { id } = await import("@instantdb/react-native");
      const profileId = id();

      await db.transact(
        db.tx.profiles[profileId]
          .update({
            username: username.toLowerCase(),
            friendCode: friendCode,
            createdAt: Date.now(),
          })
          .link({ owner: user.id })
      );

    } catch (error: any) {
      if (error.message?.includes('unique')) {
        Alert.alert("Error", "This username is already taken");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
      console.error("Error setting username:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View className="flex-1">
      <GradientBackground colors={themes.relationship.gradient} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-8"
      >
        <View className="bg-black/20 rounded-3xl p-8 backdrop-blur-xl">
          <Text className="text-white text-3xl font-bold text-center mb-2">
            Welcome to Fuzzy!
          </Text>
          <Text className="text-white/80 text-center mb-8">
            Choose your username
          </Text>

          <TextInput
            className="bg-white/10 text-white px-4 py-4 rounded-xl mb-2 text-lg"
            placeholder="Enter username"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <Text className="text-white/60 text-sm mb-6 px-2">
            3-20 characters, letters, numbers, and underscores only
          </Text>

          <TouchableOpacity
            className={`py-4 rounded-xl ${loading ? 'bg-pink-500/50' : 'bg-pink-500'}`}
            onPress={handleSetUsername}
            disabled={loading}
          >
            <Text className="text-white font-bold text-center text-lg">
              {loading ? "Setting up..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
    </TouchableWithoutFeedback>
  );
}