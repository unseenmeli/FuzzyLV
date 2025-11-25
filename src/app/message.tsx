import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from 'expo-media-library';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
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
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  Modal,
  Clipboard,
  Animated,
  PanResponder,
} from "react-native";
import { router } from "expo-router";
import db from "@/utils/db";
import { GradientBackground, themes } from "@/utils/shared";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";
import { safeNavigate } from "@/utils/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getChatId, validateChatData } from "@/utils/chatHelpers";

interface MessageType {
  id: string;
  text: string;
  senderUsername: string;
  receiverUsername: string;
  createdAt: number;
  isRead: boolean;
  reactions?: Record<string, string>;
  replyTo?: {
    id: string;
    text: string;
    senderUsername: string;
  };
  image?: string;
  chatType: string;
  chatId: string;
}

const quickReactions = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "💯"];

interface MessageItemProps {
  msg: MessageType;
  isMyMessage: boolean;
  showUsername: boolean;
  showSeen: boolean;
  theme: any;
  onLongPress: (msg: MessageType) => void;
  onReply: (msg: MessageType) => void;
  onImagePress: (uri: string) => void;
  setScrollEnabled: (enabled: boolean) => void;
}

const MessageItem = React.memo(({
  msg,
  isMyMessage,
  showUsername,
  showSeen,
  theme,
  onLongPress,
  onReply,
  onImagePress,
  setScrollEnabled
}: MessageItemProps) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const shouldRespond = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
      if (shouldRespond) {
        setScrollEnabled(false);
      }
      return shouldRespond;
    },
    onPanResponderGrant: () => {
      setScrollEnabled(false);
    },
    onPanResponderMove: (evt, gestureState) => {
      const validSwipe = isMyMessage ? gestureState.dx < 0 : gestureState.dx > 0;

      if (validSwipe) {
        const limitedDx = isMyMessage
          ? Math.max(gestureState.dx, -80)
          : Math.min(gestureState.dx, 80);
        translateX.setValue(limitedDx);

        const distance = Math.abs(gestureState.dx);
        const opacityValue = Math.min(distance / 50, 1);
        opacity.setValue(opacityValue);
      } else {
        translateX.setValue(0);
        opacity.setValue(0);
      }
    },
    onPanResponderRelease: async (evt, gestureState) => {
      setScrollEnabled(true);

      const validSwipe = isMyMessage ? gestureState.dx < 0 : gestureState.dx > 0;
      const distance = Math.abs(gestureState.dx);

      if (validSwipe && distance > 40) {
        onReply(msg);

        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
      }

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    onPanResponderTerminate: () => {
      setScrollEnabled(true);

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
  })).current;

  return (
    <View className={`mb-3 ${isMyMessage ? 'items-end' : 'items-start'}`}>
      {showUsername && !isMyMessage && (
        <Text className="text-white/50 text-xs mb-1 ml-2">
          {msg.senderUsername}
        </Text>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX }],
          alignItems: isMyMessage ? 'flex-end' : 'flex-start',
        }}
      >
        <Pressable
          onLongPress={async () => {
            Keyboard.dismiss();
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {}
            onLongPress(msg);
          }}
        >
          <View
            style={{
              backgroundColor: isMyMessage ? theme.card : "rgba(255,255,255,0.1)",
              borderColor: isMyMessage ? theme.cardBorder : "rgba(255,255,255,0.2)",
              maxWidth: 280,
            }}
            className="rounded-2xl px-4 py-3 border"
          >
            {msg.replyTo && (
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderLeftColor: theme.gradient[1],
                  borderLeftWidth: 2,
                }}
                className="mb-2 p-2 rounded"
              >
                <Text className="text-white/50 text-xs mb-1">
                  {msg.replyTo.senderUsername}
                </Text>
                <Text className="text-white/60 text-xs" numberOfLines={2}>
                  {msg.replyTo.text}
                </Text>
              </View>
            )}
            {msg.image && (
              <TouchableOpacity onPress={() => onImagePress(msg.image!)}>
                <Image
                  source={{ uri: msg.image }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 10,
                    marginBottom: msg.text !== "Photo" ? 8 : 0
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {msg.text !== "Photo" && (
              <Text className={isMyMessage ? "text-white" : "text-white/90"}>
                {msg.text}
              </Text>
            )}
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-white/40 text-xs">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              {isMyMessage && (
                <Text className="text-white/40 text-xs ml-2">
                  {msg.isRead ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <View
          className={`flex-row flex-wrap mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
          style={{ maxWidth: 280 }}
        >
          <View className="bg-black/20 rounded-full px-2 py-1 flex-row">
            {Object.entries(msg.reactions as Record<string, string>).map(([username, emoji]) => (
              <Text key={username} className="text-sm">
                {emoji}
              </Text>
            ))}
            <Text className="text-white/40 text-xs ml-1 self-center">
              {Object.keys(msg.reactions).length}
            </Text>
          </View>
        </View>
      )}
      {showSeen && (
        <Text className="text-white/30 text-xs mt-1 mr-2">
          Seen
        </Text>
      )}
    </View>
  );
});

export default function Message() {
  const { user, isLoading: authLoading } = db.useAuth();
  const [message, setMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const scrollStartY = useRef(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

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

  const consistentChatId = useMemo(() => {
    if (!userProfile?.username || !otherUsername || !choice) return null;
    return getChatId(choice.activeType, userProfile.username, otherUsername);
  }, [userProfile?.username, otherUsername, choice?.activeType]);

  const { data: messageData } = db.useQuery(
    userProfile?.username && otherUsername && choice ? {
      messages: {
        $: {
          where: {
            chatType: choice.activeType,
            or: [
              { and: [{ senderUsername: userProfile.username }, { receiverUsername: otherUsername }] },
              { and: [{ senderUsername: otherUsername }, { receiverUsername: userProfile.username }] }
            ]
          }
        }
      }
    } : {}
  );

  const messages = useMemo(() => {
    if (!messageData?.messages) {
      return [] as MessageType[];
    }
    return [...messageData.messages].sort((a: MessageType, b: MessageType) => a.createdAt - b.createdAt);
  }, [messageData?.messages]);

  useEffect(() => {
    if (messageData !== undefined) {
      setIsLoadingMessages(false);
    }
  }, [messageData]);
  const theme = themes[choice?.activeType] || themes.relationship;

  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > prevMessageCount.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!messages || messages.length === 0 || !userProfile?.username) return;

    const unreadMessages = messages.filter(
      msg => !msg.isRead && msg.receiverUsername === userProfile.username
    );

    if (unreadMessages.length > 0) {
      db.transact(
        unreadMessages.map(msg =>
          db.tx.messages[msg.id].update({ isRead: true })
        )
      ).catch(error => {
        console.error("Error marking messages as read:", error);
      });
    }
  }, [messages, userProfile?.username]);

  const handleReaction = useCallback(async (emoji: string) => {
    if (!selectedMessage || !userProfile?.username) return;

    try {
      const currentReactions = selectedMessage.reactions || {};
      const newReactions = { ...currentReactions };

      if (newReactions[userProfile.username] === emoji) {
        delete newReactions[userProfile.username];
      } else {
        newReactions[userProfile.username] = emoji;
      }

      await db.transact([
        db.tx.messages[selectedMessage.id].update({
          reactions: Object.keys(newReactions).length > 0 ? newReactions : null
        })
      ]);

      setShowMessageActions(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  }, [selectedMessage, userProfile?.username]);

  const handleCopyMessage = useCallback(() => {
    if (selectedMessage) {
      Clipboard.setString(selectedMessage.text);
      setShowMessageActions(false);
      setSelectedMessage(null);
    }
  }, [selectedMessage]);

  const handleUnsendMessage = useCallback(async () => {
    if (!selectedMessage || selectedMessage.senderUsername !== userProfile?.username) return;

    try {
      await db.transact([
        db.tx.messages[selectedMessage.id].delete()
      ]);
      setShowMessageActions(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }, [selectedMessage, userProfile?.username]);

  const handleReplyToMessage = useCallback(() => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setShowMessageActions(false);
      setSelectedMessage(null);
    }
  }, [selectedMessage]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }, []);

  const saveImage = useCallback(async () => {
    if (!viewingImage) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images');
        return;
      }

      const base64Data = viewingImage.split(',')[1];
      const filename = `fuzzy_${Date.now()}.jpg`;
      const fileUri = `${documentDirectory || ''}${filename}`;

      await writeAsStringAsync(fileUri, base64Data, {
        encoding: 'base64' as any,
      });

      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('Success', 'Image saved to gallery');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  }, [viewingImage]);

  const sendMessage = useCallback(async () => {
    const messageText = message.trim();

    if ((!messageText && !selectedImage) || !user || !userProfile || !choice || !otherUsername || !consistentChatId) {
      return;
    }

    setMessage("");

    try {
      const messageId = id();

      const msgData: any = {
        text: messageText || "Photo",
        chatType: choice.activeType,
        chatId: consistentChatId,
        senderUsername: userProfile.username,
        receiverUsername: otherUsername,
        createdAt: Date.now(),
        isRead: false,
      };

      if (selectedImage) {
        msgData.image = selectedImage;
      }

      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          senderUsername: replyingTo.senderUsername
        };
      }

      await db.transact(
        db.tx.messages[messageId]
          .update(msgData)
          .link({ sender: user.id })
      );

      setReplyingTo(null);
      setSelectedImage(null);

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
        }
      } catch (notifError) {
        console.error("Error sending push notification:", notifError);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [message, selectedImage, user, userProfile, choice, otherUsername, consistentChatId, replyingTo]);

  const handleMessageLongPress = useCallback((msg: MessageType) => {
    setSelectedMessage(msg);
    setShowMessageActions(true);
  }, []);

  const handleReply = useCallback((msg: MessageType) => {
    setReplyingTo({
      id: msg.id,
      text: msg.text,
      senderUsername: msg.senderUsername
    });
  }, []);

  const handleImagePress = useCallback((uri: string) => {
    setViewingImage(uri);
  }, []);

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
            onPress={() => safeNavigate.push("/chats")}
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
              onPress={() => safeNavigate.back()}
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
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          onScrollBeginDrag={(event) => {
            scrollStartY.current = event.nativeEvent.contentOffset.y;
            lastScrollY.current = event.nativeEvent.contentOffset.y;
          }}
          onScroll={(event) => {
            const currentY = event.nativeEvent.contentOffset.y;
            const scrollDistance = scrollStartY.current - currentY;

            if (scrollDistance > 600) {
              Keyboard.dismiss();
            }

            lastScrollY.current = currentY;
          }}
          scrollEventThrottle={16}
        >
          {isLoadingMessages ? (
            <View className="flex-1 items-center justify-center py-20">
              <LoadingSpinner message="Loading messages..." color="white" />
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-white/40 text-center">
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isMyMessage = msg.senderUsername === userProfile?.username;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

              const showUsername = !prevMsg || prevMsg.senderUsername !== msg.senderUsername;
              const showSeen = isMyMessage &&
                               msg.isRead &&
                               (!nextMsg || nextMsg.senderUsername !== msg.senderUsername);

              return (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  isMyMessage={isMyMessage}
                  showUsername={showUsername}
                  showSeen={showSeen}
                  theme={theme}
                  onLongPress={handleMessageLongPress}
                  onReply={handleReply}
                  onImagePress={handleImagePress}
                  setScrollEnabled={setScrollEnabled}
                />
              );
            })
          )}
          <View className="h-4" />
        </ScrollView>

        <View
          className="px-4 py-3 pb-6"
        >
          {selectedImage && (
            <View className="mb-2 flex-row items-center">
              <Image
                source={{ uri: selectedImage }}
                style={{ width: 80, height: 80, borderRadius: 10 }}
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="ml-3 p-2 bg-red-500/20 rounded-full"
              >
                <Text className="text-red-400">Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          {replyingTo && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderLeftColor: theme.gradient[1],
                borderLeftWidth: 3,
              }}
              className="mb-2 p-3 rounded-lg flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-white/50 text-xs mb-1">
                  Replying to {replyingTo.senderUsername}
                </Text>
                <Text className="text-white/70 text-sm" numberOfLines={1}>
                  {replyingTo.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="ml-3 p-1"
              >
                <Text className="text-white/50 text-lg">×</Text>
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            {!message.trim() && !selectedImage && (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                }}
                className="w-12 h-12 rounded-full items-center justify-center border"
              >
                <Text className="text-white text-2xl">+</Text>
              </TouchableOpacity>
            )}
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
                minHeight: 44,
                paddingHorizontal: 20,
                paddingVertical: 12,
                paddingTop: 12,
                paddingBottom: 12,
                textAlignVertical: 'center',
              }}
              className="flex-1 text-white rounded-full border"
              blurOnSubmit={true}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              enablesReturnKeyAutomatically={true}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!message.trim() && !selectedImage}
              style={{
                backgroundColor: (message.trim() || selectedImage) ? theme.card : "rgba(255,255,255,0.05)",
                borderColor: (message.trim() || selectedImage) ? theme.cardBorder : "rgba(255,255,255,0.1)",
              }}
              className="w-12 h-12 rounded-full items-center justify-center border"
            >
              <Text className="text-white text-xl">↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showMessageActions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowMessageActions(false);
          setSelectedMessage(null);
        }}
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              setShowMessageActions(false);
              setSelectedMessage(null);
            }}
          >
            <View className="flex-1 justify-center items-center">
            {selectedMessage && (
              <TouchableWithoutFeedback>
                <View className="w-11/12 max-w-sm">
                  <View
                    className={`mb-4 ${selectedMessage.senderUsername === userProfile?.username ? 'items-end' : 'items-start'}`}
                  >
                    <View
                      style={{
                        backgroundColor: selectedMessage.senderUsername === userProfile?.username
                          ? theme.card
                          : "rgba(255,255,255,0.1)",
                        borderColor: selectedMessage.senderUsername === userProfile?.username
                          ? theme.cardBorder
                          : "rgba(255,255,255,0.2)",
                        maxWidth: '85%',
                      }}
                      className="rounded-2xl px-4 py-3 border"
                    >
                      <Text className="text-white">
                        {selectedMessage.text}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: theme.gradient[2],
                      borderColor: theme.gradient[1],
                      borderWidth: 1,
                    }}
                    className="rounded-2xl px-4 py-3 mb-3"
                  >
                    <View className="flex-row justify-around mb-3">
                      {quickReactions.slice(0, 6).map(emoji => {
                        const userReaction = selectedMessage.reactions?.[userProfile?.username || ""];
                        const isSelected = userReaction === emoji;
                        return (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => handleReaction(emoji)}
                            activeOpacity={0.7}
                          >
                            <View className="items-center">
                              <Text className="text-2xl">{emoji}</Text>
                              {isSelected && (
                                <View
                                  style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    marginTop: 4,
                                  }}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View className="border-t border-white/20 pt-3">
                      <TouchableOpacity
                        onPress={handleReplyToMessage}
                        className="py-3"
                      >
                        <Text className="text-white text-center">Reply</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleCopyMessage}
                        className="py-3"
                      >
                        <Text className="text-white text-center">Copy Message</Text>
                      </TouchableOpacity>

                      {selectedMessage.senderUsername === userProfile?.username && (
                        <TouchableOpacity
                          onPress={handleUnsendMessage}
                          className="py-3"
                        >
                          <Text className="text-red-400 text-center">Unsend Message</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            )}
            </View>
          </TouchableWithoutFeedback>
        </BlurView>
      </Modal>

      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View className="flex-1 bg-black">
          <TouchableOpacity
            onPress={() => setViewingImage(null)}
            className="absolute top-14 left-4 z-10 p-2"
          >
            <Text className="text-white text-2xl">×</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveImage}
            className="absolute top-14 right-4 z-10 p-2 bg-white/20 rounded-full"
          >
            <Text className="text-white">Save</Text>
          </TouchableOpacity>

          {viewingImage && (
            <View className="flex-1 justify-center items-center">
              <Image
                source={{ uri: viewingImage }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}