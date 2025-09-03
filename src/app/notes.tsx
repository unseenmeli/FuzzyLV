import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, RefreshControl } from "react-native";
import { router } from "expo-router";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";

const moods = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😔", label: "Sad" },
  { emoji: "😡", label: "Angry" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😍", label: "In Love" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "😎", label: "Cool" },
  { emoji: "🤗", label: "Hugging" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "🥺", label: "Pleading" },
  { emoji: "😭", label: "Crying" },
  { emoji: "🥰", label: "Loving" },
];

export default function Notes() {
  const { user } = db.useAuth();

  const { data: userData } = db.useQuery(
    user ? {
      profiles: { $: { where: { "owner.id": user.id } } },
      choice: { $: { where: { "owner.id": user.id } } },
      relationships: { $: { where: { "owner.id": user.id } } },
      friendships: { $: { where: { "owner.id": user.id } } },
    } : {}
  );

  const { data: allRelationships } = db.useQuery({
    relationships: {},
    friendships: {}
  });

  const userProfile = userData?.profiles?.[0];
  const choice = userData?.choice?.[0];

  const activeChat = choice?.activeType === "relationship"
    ? userData?.relationships?.find((r: any) => r.id === choice.activeId)
    : userData?.friendships?.find((f: any) => f.id === choice.activeId);

  const [selectedMood, setSelectedMood] = useState(activeChat?.mood || "😊");
  const [note, setNote] = useState(activeChat?.note || "");
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const theme = themes[choice?.activeType] || themes.relationship;
  const isRelationship = choice?.activeType === "relationship";

  const onRefresh = async () => {
    setRefreshing(true);
    try {


      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!activeChat || !choice || !userProfile) return;

    try {
      if (choice.activeType === "relationship") {
        await db.transact([
          db.tx.relationships[activeChat.id].update({
            mood: selectedMood,
            note: note
          })
        ]);

        const partnerUsername = activeChat.partnerUsername;
        const partnerRelationship = allRelationships?.relationships?.find(
          (r: any) => r.partnerUsername === userProfile.username &&
                      r.owner?.id !== user.id
        );

        if (partnerRelationship) {
          await db.transact([
            db.tx.relationships[partnerRelationship.id].update({
              partnerMood: selectedMood,
              partnerNote: note
            })
          ]);
        }
      } else if (choice.activeType === "friendship") {
        await db.transact([
          db.tx.friendships[activeChat.id].update({
            mood: selectedMood,
            note: note
          })
        ]);

        const partnerFriendship = allRelationships?.friendships?.find(
          (f: any) => {
            const isPartnerRecord = f.owner?.id !== user.id;
            const isMatchingFriendship = f.friendUsername === userProfile.username;
            return isPartnerRecord && isMatchingFriendship;
          }
        );

        if (partnerFriendship) {
          await db.transact([
            db.tx.friendships[partnerFriendship.id].update({
              friendMood: selectedMood,
              friendNote: note
            })
          ]);
        }
      }
      router.back();
    } catch (error) {
      console.error("Error updating mood and note:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View className="flex-1">
      <GradientBackground colors={theme.gradient} />

      <View
        style={{
          backgroundColor: theme.header,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          borderWidth: 1,
          borderColor: theme.headerBorder,
          paddingTop: 40,
          height: 170,
        }}
        className="w-full shadow-xl z-10"
      >
        <View className="flex-1 flex-row items-center justify-center px-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4"
            style={{ padding: 10 }}
          >
            <Text className="text-white text-3xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold">
            {isRelationship ? "Love Notes" : "Notes"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          className="w-full p-5 shadow-xl mb-6"
        >
          <Text className={`font-semibold text-lg ${theme.textMedium} mb-4`}>
            Select Mood
          </Text>
          <View className="flex-row flex-wrap justify-center">
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.emoji}
                onPress={() => setSelectedMood(mood.emoji)}
                style={{
                  backgroundColor: selectedMood === mood.emoji ? theme.innerCard : "transparent",
                  borderWidth: selectedMood === mood.emoji ? 1 : 0,
                  borderColor: theme.innerCardBorder,
                }}
                className="p-3 m-2 rounded-xl items-center"
              >
                <Text className="text-5xl mb-1" style={{ lineHeight: 60 }}>{mood.emoji}</Text>
                <Text className="text-white/60 text-xs">{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          className="w-full p-5 shadow-xl mb-6"
        >
          <Text className={`font-semibold text-lg ${theme.textMedium} mb-4`}>
            {isRelationship ? "Love Note" : "Note"}
          </Text>
          <TextInput
            className="bg-white/10 text-white px-4 py-3 rounded-xl text-base"
            style={{
              minHeight: 120,
              maxHeight: 200,
              textAlignVertical: "top"
            }}
            placeholder={isRelationship ? "Write a love note..." : "Write a note..."}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={5}
            scrollEnabled={false}
            blurOnSubmit={true}
            returnKeyType="done"
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: choice?.activeType === "relationship" ? "#ec4899" :
                           choice?.activeType === "friendship" ? "#3b82f6" : "#10b981",
          }}
          className="py-4 rounded-xl mb-4"
        >
          <Text className="text-white font-bold text-center text-lg">
            Save {isRelationship ? "Love Note" : "Note"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="py-4 mb-8"
        >
          <Text className="text-white/60 text-center">Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </TouchableWithoutFeedback>
  );
}