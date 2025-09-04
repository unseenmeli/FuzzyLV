import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Linking, Modal, FlatList, Alert } from "react-native";
import { router } from "expo-router";
import db from "@/utils/db";
import Login from "@/components/Login";
import UsernameSetup from "@/components/UsernameSetup";
import { GradientBackground, themes } from "@/utils/shared";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as ImagePicker from "expo-image-picker";
import { id } from "@instantdb/react-native";
import ErrorBoundary from "@/components/ErrorBoundary";
import NavigationWrapper from "@/components/NavigationWrapper";

const availableEmojis = [
  "😊", "😎", "🤓", "😇", "🤩", "😘", "🥰", "😍", "🤗", "🤝",
  "👨", "👩", "🧑", "👨‍🦱", "👩‍🦱", "👨‍🦰", "👩‍🦰", "👱‍♂️", "👱‍♀️", "👨‍🦳",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐝", "🐢", "🐙", "🦋",
  "⭐", "🌟", "✨", "💫", "🌈", "🔥", "💧", "⚡", "🌊", "🍀",
];

export default function index() {
  let user, isLoading;
  
  try {
    const auth = db.useAuth();
    user = auth.user;
    isLoading = auth.isLoading;
  } catch (error) {
    console.warn("Navigation context not ready:", error);
    // Return loading state while navigation initializes
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading...</Text>
        </View>
      </View>
    );
  }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: { $: { where: { "owner.id": user.id } } },
        }
      : {}
  );

  const userProfile = profileData?.profiles?.[0];
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile || !Device.isDevice) return;
    
    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Push notification permissions not granted');
          return;
        }

        const projectId = 'b329d4ad-adac-44d8-8a06-369a539387e4';
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId,
          applicationId: 'com.unseenmeli.fuzzy',
        });
        
        const token = tokenResponse.data;
        setPushToken(token);
        
        if (token && token !== userProfile.pushToken) {
          await db.transact([
            db.tx.profiles[userProfile.id].update({
              pushToken: token,
              notificationsEnabled: true
            })
          ]);
          console.log("Push token saved:", token);
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };
    
    setupNotifications();
  }, [userProfile?.id]);

  const { data: choiceData } = db.useQuery(
    user && userProfile?.username
      ? {
          choice: { $: { where: { "owner.id": user.id } } },
          relationships: { $: { where: { "owner.id": user.id } } },
          friendships: { $: { where: { "owner.id": user.id } } },
          connections: {
            $: {
              where: {
                or: [
                  { senderUsername: userProfile.username },
                  { receiverUsername: userProfile.username },
                ],
              },
            },
          },
        }
      : {}
  );

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

  const pickImage = async () => {
    if (!activeChat || !choice) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        if (choice.activeType === "friendship") {
          await db.transact([
            db.tx.friendships[activeChat.id].update({
              photo: base64Image,
              emoji: null
            })
          ]);
        } else if (choice.activeType === "relationship") {
          await db.transact([
            db.tx.relationships[activeChat.id].update({
              photo: base64Image,
              emoji: null
            })
          ]);
        }
        setShowPhotoOptions(false);
      } catch (error) {
        console.error("Error updating photo:", error);
        Alert.alert("Error", "Failed to update photo");
      }
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (!activeChat || !choice) return;
    
    try {
      if (choice.activeType === "friendship") {
        await db.transact([
          db.tx.friendships[activeChat.id].update({
            emoji: emoji,
            photo: null
          })
        ]);
      } else if (choice.activeType === "relationship") {
        await db.transact([
          db.tx.relationships[activeChat.id].update({
            emoji: emoji,
            photo: null
          })
        ]);
      }
      setShowEmojiPicker(false);
      setShowPhotoOptions(false);
    } catch (error) {
      console.error("Error updating emoji:", error);
      Alert.alert("Error", "Failed to update emoji");
    }
  };

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
          paddingTop: 40,
          height: 170,
        }}
        className="w-full shadow-xl z-10"
      >
        <View className="flex-1 items-end flex-row pb-4">
          {choice ? (
            <View className="flex-row items-center w-full">
              <TouchableOpacity
                onPress={() => setShowPhotoOptions(true)}
                className={`w-24 h-24 rounded-full ml-4 border-4 ${theme.borderAccent}`}
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
                      style={{ includeFontPadding: false, lineHeight: 60 }}
                    >
                      {(activeChat as any)?.partnerMood || (activeChat as any)?.friendMood || (activeChat as any)?.emoji || "💕"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View className="flex-1 items-center pr-24">
                <Text className="text-4xl text-white font-bold">
                  {choice?.activeName}
                </Text>
                <Text className={`text-sm ${theme.textLight} mt-1`}>
                  Connected {(activeChat as any)?.partnerMood || (activeChat as any)?.friendMood || "💕"}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-5xl text-white font-bold text-center">
                Welcome to Fuzzy!
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {choice ? (
        <>
        {choice.activeType !== "connection" && (
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
            className="w-full p-4 shadow-xl"
          >
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text
                  className={`font-semibold text-base ${theme.textMedium} mb-1`}
                >
                  Expression
                </Text>
                <Text className="text-white/60 text-center text-xs mb-2">
                  {(activeChat as any)?.partnerMood === "😊" || (activeChat as any)?.friendMood === "😊" ? "Happy" :
                   (activeChat as any)?.partnerMood === "😔" || (activeChat as any)?.friendMood === "😔" ? "Sad" :
                   (activeChat as any)?.partnerMood === "😡" || (activeChat as any)?.friendMood === "😡" ? "Angry" :
                   (activeChat as any)?.partnerMood === "😴" || (activeChat as any)?.friendMood === "😴" ? "Tired" :
                   (activeChat as any)?.partnerMood === "😍" || (activeChat as any)?.friendMood === "😍" ? "In Love" :
                   (activeChat as any)?.partnerMood === "🤔" || (activeChat as any)?.friendMood === "🤔" ? "Thinking" :
                   (activeChat as any)?.partnerMood === "😎" || (activeChat as any)?.friendMood === "😎" ? "Cool" :
                   "No mood set"}
                </Text>
                <Text className="text-5xl" style={{ lineHeight: 60 }}>
                  {(activeChat as any)?.partnerMood || (activeChat as any)?.friendMood || "🤷"}
                </Text>
              </View>
              <View className="flex-1 items-center px-3">
                <Text
                  className={`font-semibold text-base ${theme.textMedium} mb-2`}
                >
                  Note
                </Text>
                <Text className="text-white/80 text-center text-sm leading-5">
                  {(activeChat as any)?.partnerNote || (activeChat as any)?.friendNote || "No note yet"}
                </Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {choice.activeType !== "connection" && (
        <View className="w-full items-center my-6">
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
              className="flex-row items-center justify-between rounded-xl p-4 border mb-4"
              onPress={() => router.push("/notes")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">
                  {choice?.activeType === "relationship" ? "💌" : "📝"}
                </Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  {choice?.activeType === "relationship" ? "Love Notes" : "Notes"}
                </Text>
              </View>
              <Text className={`${theme.textAccent} text-2xl`}>›</Text>
            </TouchableOpacity>

            {choice?.activeType === "relationship" && (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.innerCard,
                  borderColor: theme.innerCardBorder,
                }}
                className="flex-row items-center justify-between rounded-xl p-4 border"
                onPress={() => router.push("/finger-tap")}
              >
                <View className="flex-row items-center">
                  <Text className="text-4xl mr-4">👆</Text>
                  <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                    Finger Tap
                  </Text>
                </View>
                <Text className={`${theme.textAccent} text-2xl`}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        )}

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
                onPress={() => router.push("/spicy-message")}
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
        </>
        ) : (
          <View className="flex-1 items-center justify-center px-8 py-8">
            <Image 
              source={require("../../assets/fuzzyload.png")}
              style={{ 
                width: 150, 
                height: 150, 
                marginBottom: 32, 
                borderRadius: 30,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 8,
                },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            />
            <Text className={`text-3xl ${theme.text} font-bold mb-4`}>
              Your soul-bonding space
            </Text>
            <Text className={`text-lg ${theme.text} text-center mb-8 leading-7 font-medium`}>
              Fuzzy is where relationships deepen and new connections bloom. Whether strengthening bonds with loved ones or growing closer to new people through connections, this is your space for meaningful intimacy.
            </Text>
            <Text className={`text-base ${theme.textMedium} text-center font-semibold mb-12`}>
              Start by adding friends and selecting a chat
            </Text>
            
            <View className="border-t border-white/10 pt-6 mt-auto">
              <Text className={`text-sm ${theme.textLight} text-center mb-3`}>
                Created by Meli
              </Text>
              <View className="flex-row justify-center gap-6 mb-4">
                <TouchableOpacity onPress={() => Linking.openURL('https://github.com/unseenmeli')}>
                  <Text className={`text-sm ${theme.textMedium}`}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('https://x.com/unseenmeli_')}>
                  <Text className={`text-sm ${theme.textMedium}`}>X</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/meli.yd/')}>
                  <Text className={`text-sm ${theme.textMedium}`}>Instagram</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/in/dave-asanidze-325b11309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app')}>
                  <Text className={`text-sm ${theme.textMedium}`}>LinkedIn</Text>
                </TouchableOpacity>
              </View>
              <Text className={`text-xs ${theme.textLight} text-center mb-1`}>
                Want to contact me?
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:unseenmeli@gmail.com')}>
                <Text className={`text-sm ${theme.textMedium} text-center font-medium`}>unseenmeli@gmail.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
            onPress={() => router.replace("/profile")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>◔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showPhotoOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity 
            className="flex-1" 
            activeOpacity={1}
            onPress={() => setShowPhotoOptions(false)}
          />
          <View
            style={{
              backgroundColor: choice?.activeType === "relationship" ? "#831843" : 
                             choice?.activeType === "friendship" ? "#1e3a8a" : 
                             "#166534",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">Change {choice?.activeName}'s Picture</Text>
              <TouchableOpacity
                onPress={() => setShowPhotoOptions(false)}
                className="bg-white/10 rounded-full p-2"
              >
                <Text className="text-white text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={pickImage}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
              }}
              className="py-4 rounded-xl border mb-3"
            >
              <Text className="text-white text-center font-semibold text-lg">
                📷 Upload Photo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setShowPhotoOptions(false);
                setShowEmojiPicker(true);
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
              }}
              className="py-4 rounded-xl border mb-3"
            >
              <Text className="text-white text-center font-semibold text-lg">
                😊 Choose Emoji
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity 
            className="flex-1" 
            activeOpacity={1}
            onPress={() => setShowEmojiPicker(false)}
          />
          <View
            style={{
              backgroundColor: choice?.activeType === "relationship" ? "#831843" : 
                             choice?.activeType === "friendship" ? "#1e3a8a" : 
                             "#166534",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
              maxHeight: "60%",
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">Choose an Emoji</Text>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(false)}
                className="bg-white/10 rounded-full p-2"
              >
                <Text className="text-white text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableEmojis}
              numColumns={5}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleEmojiSelect(item)}
                  className="flex-1 items-center justify-center py-3"
                >
                  <Text style={{ fontSize: 32 }}>{item}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
