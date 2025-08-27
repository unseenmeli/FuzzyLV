import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = () => {
    if (!email) return;
    db.auth.sendMagicCode({ email });
    setSentEmail(email);
  };

  const handleVerifyCode = () => {
    if (!code || !sentEmail) return;
    db.auth.signInWithMagicCode({ email: sentEmail, code });
  };

  return (
    <View className="flex-1">
      <GradientBackground colors={themes.relationship.gradient} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-8"
      >
        {!sentEmail ? (
          // Email input step
          <View className="bg-black/20 rounded-3xl p-8 backdrop-blur-xl">
            <Text className="text-white text-3xl font-bold text-center mb-2">
              Welcome to Fuzzy
            </Text>
            <Text className="text-white/80 text-center mb-8">
              Sign in with your email
            </Text>
            
            <TextInput
              className="bg-white/10 text-white px-4 py-4 rounded-xl mb-4 text-lg"
              placeholder="Enter your email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              className="bg-pink-500 py-4 rounded-xl"
              onPress={handleSendCode}
            >
              <Text className="text-white font-bold text-center text-lg">
                Send Magic Code
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Code verification step
          <View className="bg-black/20 rounded-3xl p-8 backdrop-blur-xl">
            <Text className="text-white text-3xl font-bold text-center mb-2">
              Check your email
            </Text>
            <Text className="text-white/80 text-center mb-8">
              We sent a code to {sentEmail}
            </Text>
            
            <TextInput
              className="bg-white/10 text-white px-4 py-4 rounded-xl mb-4 text-lg text-center"
              placeholder="Enter 6-digit code"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            
            <TouchableOpacity
              className="bg-pink-500 py-4 rounded-xl mb-4"
              onPress={handleVerifyCode}
            >
              <Text className="text-white font-bold text-center text-lg">
                Verify Code
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setSentEmail("");
                setCode("");
              }}
            >
              <Text className="text-white/70 text-center">
                Use different email
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}