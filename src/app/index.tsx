import React from "react";
import { View, Text, TouchableOpacity, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import db from "@/utils/db";
import Login from "@/components/Login";
import UsernameSetup from "@/components/UsernameSetup";
import { GradientBackground, themes } from "@/utils/shared";

export default function index() {
  const { user, isLoading } = db.useAuth();

  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: { $: { where: { "owner.id": user.id } } },
        }
      : {}
  );

  const { data: choiceData } = db.useQuery(
    user
      ? {
          choice: { $: { where: { "owner.id": user.id } } },
          relationships: { $: { where: { "owner.id": user.id } } },
          friendships: { $: { where: { "owner.id": user.id } } },
          connections: {
            $: {
              where: {
                or: [
                  { senderUsername: profileData?.profiles?.[0]?.username },
                  { receiverUsername: profileData?.profiles?.[0]?.username },
                ],
              },
            },
          },
        }
      : {}
  );

  const userProfile = profileData?.profiles?.[0];
  const choice = choiceData?.choice?.[0];

  const getActiveChat = () => {
    if (!choice) return null;

    if (choice.activeType === "relationship") {
      return choiceData?.relationships?.find((r: any) => r?.id === choice.activeId);
    } else if (choice.activeType === "friendship") {
      return choiceData?.friendships?.find((f: any) => f?.id === choice.activeId);
    } else if (choice.activeType === "connection") {
      return choiceData?.connections?.find((c: any) => c?.id === choice.activeId);
    }
    return null;
  };

  const activeChat = getActiveChat();
  const theme = themes[choice?.activeType] || themes.relationship;

  if (isLoading) {
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profileData === undefined) {
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!userProfile) {
    return <UsernameSetup user={user} />;
  }

  return (
    <View className="flex-1">
      <GradientBackground colors={theme.gradient} />

      <View
        style={{
          backgroundColor: theme.header,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          borderWidth: 1,
          borderColor: theme.headerBorder,
        }}
        className="w-full h-40 shadow-xl z-10"
      >
        <View className="flex-1 items-end flex-row pb-4">
          <View className="flex-row items-center">
            <View
              className={`w-24 h-24 rounded-full mx-4 border-4 ${theme.borderAccent}`}
              style={{ overflow: "visible" }}
            >
              {(activeChat as any)?.photo ? (
                <Image
                  source={{ uri: (activeChat as any).photo }}
                  style={{ width: "100%", height: "100%", borderRadius: 48 }}
                />
              ) : (
                <View className="w-full h-full bg-white/10 items-center justify-center rounded-full">
                  <Text
                    className="text-5xl"
                    style={{ includeFontPadding: false }}
                  >
                    {(activeChat as any)?.emoji || choice?.activeEmoji || "💕"}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-4xl text-white font-bold">
                {choice?.activeName || "No Selection"}
              </Text>
              <Text className={`text-sm ${theme.textLight} mt-1`}>
                {choice
                  ? `Connected ${choice.activeEmoji || "💕"}`
                  : "Select a chat"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="w-full items-center my-6">
          <Text className={`text-2xl font-bold p-2 ${theme.text} mb-3`}>
            {choice?.activeName || "Select"}'s mood
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            className="w-full p-5 shadow-xl"
          >
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text
                  className={`font-semibold text-lg ${theme.textMedium} mb-3`}
                >
                  Expression
                </Text>
                <Text className="text-7xl" style={{ lineHeight: 112 }}>
                  😊
                </Text>
              </View>
              <View className="flex-1 items-center px-3">
                <Text
                  className={`font-semibold text-lg ${theme.textMedium} mb-3`}
                >
                  Note
                </Text>
                <Text className="text-white/80 text-center text-sm leading-5">
                  Happy
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* <View className="w-full items-center my-6">
          <Text className={`text-2xl font-bold p-2 ${theme.text} mb-3`}>
            Tools
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            className="w-full p-5 shadow-xl"
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
              }}
              className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
              onPress={() => router.push("/tools-chats/fingerTap")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">👆</Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  FingerTap
                </Text>
              </View>
              <Text className={`${theme.textAccent} text-2xl`}>›</Text>
            </TouchableOpacity>

            {choice?.activeType === "relationship" ? (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.innerCard,
                  borderColor: theme.innerCardBorder,
                }}
                className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
                onPress={() => router.push("/tools-chats/lovenotes")}
              >
                <View className="flex-row items-center">
                  <Text className="text-4xl mr-4">💌</Text>
                  <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                    Love Notes
                  </Text>
                </View>
                <Text className={`${theme.textAccent} text-2xl`}>›</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.innerCard,
                  borderColor: theme.innerCardBorder,
                }}
                className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
                onPress={() => router.push("/tools-chats/notes")}
              >
                <View className="flex-row items-center">
                  <Text className="text-4xl mr-4">📝</Text>
                  <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                    Notes
                  </Text>
                </View>
                <Text className={`${theme.textAccent} text-2xl`}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View> */}

        <View className="w-full items-center my-6">
          <Text className={`text-2xl font-bold p-2 ${theme.text} mb-3`}>
            Chats
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            className="w-full p-5 shadow-xl"
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
              }}
              className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
              onPress={() => router.push("/message")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">💬</Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  Message
                </Text>
              </View>
              <Text className={`${theme.textAccent} text-2xl`}>›</Text>
            </TouchableOpacity>

            {choice?.activeType === "relationship" ? (
              <TouchableOpacity
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                className="flex-row items-center justify-between rounded-xl p-4 border border-pink-200/30"
              >
                <View className="flex-row items-center">
                  <View className="bg-red-500/80 rounded-md px-2 py-0.5 mr-3">
                    <Text className="text-white text-xs font-bold">18+</Text>
                  </View>
                  <Text className="text-4xl mr-3">🔥</Text>
                  <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                    Spicy Convo
                  </Text>
                </View>
                <Text className={`${theme.textAccent} text-2xl`}>›</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="h-32" />
      </ScrollView>

      <View
        style={{
          backgroundColor: theme.footer,
          borderTopWidth: 1,
          borderTopColor: theme.footerBorder,
        }}
        className="bottom-0 left-0 right-0"
      >
        <View className="flex-row justify-around items-center py-4 pb-8">
          <TouchableOpacity className="items-center px-4">
            <Text className={`text-2xl ${theme.textAccent}`}>⌂♡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center px-4"
            onPress={() => router.push("/chats")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>◭</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center px-4"
            onPress={() => router.push("/profile")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>◔</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center px-4">
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
