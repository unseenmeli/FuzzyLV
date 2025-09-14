import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";

interface AgeVerificationProps {
  onVerified: (ageGroup: "teen" | "adult") => void;
  user?: any;
  userProfile?: any;
}

export default function AgeVerification({ onVerified, user, userProfile }: AgeVerificationProps) {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const theme = themes.relationship;

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleVerification = async () => {
    if (!birthDate) {
      Alert.alert("Please select your birth date", "We need to verify your age to continue.");
      return;
    }

    const age = calculateAge(birthDate);

    if (age < 13) {
      Alert.alert(
        "Age Requirement Not Met",
        "You must be at least 13 years old to use Fuzzy. Please come back when you're older!",
        [{ text: "OK" }]
      );
      return;
    }

    const ageGroup = age >= 18 ? "adult" : "teen";

    await AsyncStorage.setItem("ageVerified", "true");
    await AsyncStorage.setItem("ageGroup", ageGroup);
    await AsyncStorage.setItem("birthDate", birthDate.toISOString());

    if (user && userProfile) {
      try {
        await db.transact(
          db.tx.profiles[userProfile.id].update({
            ageGroup: ageGroup
          })
        );
      } catch (error) {
        console.error("Error saving age group to database:", error);
      }
    }

    if (ageGroup === "teen") {
      Alert.alert(
        "Welcome to Fuzzy!",
        "As a teen user, you'll have access to all features except adult content. Stay safe and have fun connecting with friends!",
        [{ text: "Got it!", onPress: () => onVerified(ageGroup) }]
      );
    } else {
      onVerified(ageGroup);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  return (
    <View className="flex-1">
      <GradientBackground colors={theme.gradient} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 justify-center items-center min-h-screen">
          <View className="w-full max-w-sm">
            <View className="items-center mb-8">
              <Text className="text-6xl mb-4">🔒</Text>
              <Text className="text-4xl font-bold text-white mb-2">
                Age Verification
              </Text>
              <Text className="text-white/80 text-center text-base">
                We need to verify your age to continue.
              </Text>
            </View>

            <View className="mb-8">
              <Text className="text-white font-semibold mb-3 text-lg">
                When were you born?
              </Text>
              
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
                className="p-4 rounded-2xl flex-row justify-between items-center"
              >
                <Text className="text-white text-base">
                  {birthDate ? formatDate(birthDate) : "Select your birth date"}
                </Text>
                <Text className="text-2xl">📅</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || maxDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  textColor="white"
                />
              )}
            </View>


            <TouchableOpacity
              onPress={handleVerification}
              disabled={!birthDate}
              style={{
                opacity: birthDate ? 1 : 0.5,
                backgroundColor: "white",
              }}
              className="py-4 rounded-2xl items-center"
            >
              <Text className="text-purple-600 font-bold text-lg">
                Verify My Age
              </Text>
            </TouchableOpacity>

            <Text className="text-white/60 text-xs text-center mt-6 px-4">
              Your birth date is stored locally and used only for age verification. 
              We respect your privacy and never share this information.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}