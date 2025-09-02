import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import db from "@/utils/db";
import { GradientBackground, themes } from "@/utils/shared";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";

export default function Message() {
  const { user } = db.useAuth();
  const [message, setMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: profileData } = db.useQuery(
    user ? {
      profiles: { $: { where: { "owner.id": user.id } } },
      choice: { $: { where: { "owner.id": user.id } } }
    } : {}
  );
  
  const userProfile = profileData?.profiles?.[0];
  const choice = profileData?.choice?.[0];
  
  const { data: chatData } = db.useQuery(
    user && choice ? {
      relationships: choice.activeType === "relationship" 
        ? { $: { where: { id: choice.activeId } } } 
        : {},
      friendships: choice.activeType === "friendship"
        ? { $: { where: { id: choice.activeId } } }
        : {},
      connections: choice.activeType === "connection"
        ? { $: { where: { id: choice.activeId } } }
        : {},
    } : {}
  );

  const activeChat = choice?.activeType === "relationship" 
    ? chatData?.relationships?.[0]
    : choice?.activeType === "friendship"
    ? chatData?.friendships?.[0]
    : chatData?.connections?.[0];

  const getOtherUsername = () => {
    if (!activeChat || !userProfile) return null;
    
    if (choice?.activeType === "relationship") {
      return (activeChat as any).partnerUsername;
    } else if (choice?.activeType === "friendship") {
      return (activeChat as any).friendUsername;
    } else if (choice?.activeType === "connection") {
      return (activeChat as any).senderUsername === userProfile.username
        ? (activeChat as any).receiverUsername
        : (activeChat as any).senderUsername;
    }
    return null;
  };

  const otherUsername = getOtherUsername();

  const { data: messageData } = db.useQuery(
    userProfile ? {
      messages: {}
    } : {}
  );

  const messages = React.useMemo(() => {
    if (!messageData?.messages || !choice || !userProfile?.username || !otherUsername) return [];
    
    const usernames = [userProfile.username, otherUsername].sort();
    const chatId = `${choice.activeType}_${usernames[0]}_${usernames[1]}`;
    
    const filtered = messageData.messages.filter(msg => 
      msg.chatType === choice.activeType && 
      msg.chatId === chatId
    );
    
    
    console.log("Filtered messages:", filtered.length, "from total:", messageData.messages.length);
    console.log("Looking for chatType:", choice.activeType, "chatId:", chatId);
    
    return filtered.sort((a, b) => a.createdAt - b.createdAt);
  }, [messageData?.messages, choice, userProfile?.username, otherUsername]);
  const theme = themes[choice?.activeType] || themes.relationship;

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const getChatId = () => {
    if (!userProfile?.username || !otherUsername) return null;
    const usernames = [userProfile.username, otherUsername].sort();
    return `${choice?.activeType}_${usernames[0]}_${usernames[1]}`;
  };

  const consistentChatId = getChatId();

  const sendMessage = async () => {
    if (!message.trim() || !user || !userProfile || !choice || !otherUsername || !consistentChatId) {
      console.log("Missing required data:", { 
        message: message.trim(), 
        user: !!user, 
        userProfile: !!userProfile, 
        choice: !!choice,
        otherUsername,
        consistentChatId
      });
      return;
    }

    const messageText = message.trim();
    setMessage("");

    try {
      const messageId = id();
      console.log("Sending message with:", {
        chatType: choice.activeType,
        chatId: consistentChatId,
        senderUsername: userProfile.username,
        receiverUsername: otherUsername,
        text: messageText
      });
      
      await db.transact(
        db.tx.messages[messageId]
          .update({
            text: messageText,
            chatType: choice.activeType,
            chatId: consistentChatId,
            senderUsername: userProfile.username,
            receiverUsername: otherUsername,
            createdAt: Date.now(),
            isRead: false,
          })
          .link({ sender: user.id })
      );
      
      console.log("Message sent successfully!");
      
      try {
        const recipientResult = await db.queryOnce({
          profiles: {
            $: {
              where: { username: otherUsername }
            }
          }
        });
        
        const recipientProfile = recipientResult.data?.profiles?.[0];
        
        if (recipientProfile?.pushToken && recipientProfile?.notificationsEnabled) {
          await pushNotificationService.sendMessageNotification(
            recipientProfile.pushToken,
            userProfile.username,
            messageText,
            choice.activeType as 'relationship' | 'friendship' | 'connection'
          );
          console.log("Push notification sent to:", otherUsername);
        }
      } catch (notifError) {
        console.error("Error sending push notification:", notifError);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  if (!choice) {
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-xl text-center mb-4">No Chat Selected</Text>
          <Text className="text-white/60 text-center mb-6">
            Select a chat from the Chats screen first
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/chats")}
            className="bg-white/10 rounded-xl px-6 py-3 border border-white/20"
          >
            <Text className="text-white font-semibold">Go to Chats</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
          paddingTop: 50,
        }}
        className="shadow-xl"
      >
        <View className="h-20">
          <View className="flex-row items-center h-full px-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/10 rounded-full w-10 h-10 items-center justify-center mr-4 border border-white/20"
            >
              <Text className="text-white text-lg font-bold">‹</Text>
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center">
              {activeChat && choice?.activeType === "friendship" && (activeChat as any).photo ? (
                <Image
                  source={{ uri: (activeChat as any).photo }}
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                />
              ) : (
                <Text className="text-3xl mr-3">
                  {choice.activeEmoji || "💕"}
                </Text>
              )}
              <Text className="text-3xl text-white font-bold">
                {choice.activeName}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-white/40 text-center">
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.senderUsername === userProfile?.username;
              return (
                <View
                  key={msg.id}
                  className={`mb-3 ${isMyMessage ? 'items-end' : 'items-start'}`}
                >
                  <View
                    style={{
                      backgroundColor: isMyMessage 
                        ? theme.card
                        : "rgba(255,255,255,0.1)",
                      borderColor: isMyMessage
                        ? theme.cardBorder
                        : "rgba(255,255,255,0.2)",
                      maxWidth: '75%',
                    }}
                    className="rounded-2xl px-4 py-3 border"
                  >
                    <Text className={isMyMessage ? "text-white" : "text-white/90"}>
                      {msg.text}
                    </Text>
                    <Text className="text-white/40 text-xs mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          <View className="h-4" />
        </ScrollView>

        <View
          style={{
            backgroundColor: theme.footer,
            borderTopWidth: 1,
            borderTopColor: theme.footerBorder,
          }}
          className="px-4 py-3 pb-6"
        >
          <View className="flex-row items-center gap-2">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              maxLength={500}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
                maxHeight: 100,
              }}
              className="flex-1 text-white px-4 py-3 rounded-full border"
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!message.trim()}
              style={{
                backgroundColor: message.trim() ? theme.card : "rgba(255,255,255,0.05)",
                borderColor: message.trim() ? theme.cardBorder : "rgba(255,255,255,0.1)",
              }}
              className="w-12 h-12 rounded-full items-center justify-center border"
            >
              <Text className="text-white text-xl">↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}