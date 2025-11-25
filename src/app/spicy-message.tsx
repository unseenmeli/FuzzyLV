import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { documentDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { safeNavigate } from "@/utils/navigation";
import db from "@/utils/db";
import { GradientBackground } from "@/utils/shared";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";

const quickReactions = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "💯"];

const spicyQuestions = {
  light: [
    "What was your first impression of me?",
    "What's your favorite physical feature of mine?",
    "When did you first realize you were attracted to me?",
    "What outfit of mine drives you crazy?",
    "Where's the most romantic place you'd want to kiss me?",
    "What's something I do that always turns you on?",
    "How would you describe our chemistry to someone?",
    "What's your favorite memory of us being intimate?",
    "If you could relive our first kiss, would you change anything?",
    "What song makes you think of us being together?",
    "What do you think about when you see me?",
    "What's your favorite thing about our relationship?",
    "How do I make you feel when we're together?",
    "What's the most romantic thing I've done for you?",
    "When do you feel most connected to me?",
    "What's your favorite way to show me affection?",
    "If you could describe me in three words, what would they be?",
    "What's something about me that always makes you smile?",
    "How did you know I was the one?",
    "What's your favorite place to cuddle with me?",
    "What do you love most about our physical connection?",
    "What's something sweet you want to tell me?",
    "How do you feel when we hold hands?",
    "What's your favorite compliment I've given you?",
    "What makes our love special?",
  ],
  medium: [
    "What's your biggest turn on that I do without realizing?",
    "Describe your perfect intimate evening with me",
    "What's a fantasy you've had about us?",
    "Where's the riskiest place you'd want to kiss me?",
    "What part of my body do you think about most?",
    "If we had a whole weekend alone, what would we do?",
    "What's something new you'd like to try together?",
    "How do you like to be seduced?",
    "What makes you feel most desired by me?",
    "Describe the last dream you had about me",
    "What's your favorite way to be touched?",
    "If you could plan the perfect date night ending, what would it be?",
    "What's your favorite intimate memory of us?",
    "How do you want me to surprise you?",
    "What's something you find irresistibly attractive about me?",
    "Describe the perfect morning together",
    "What's a secret thought you have about me during the day?",
    "How do you like to be kissed?",
    "What would you do if we were alone right now?",
    "What's your favorite type of foreplay?",
    "Tell me about a time I made you feel incredibly desired",
    "What's something playful you want to try?",
    "How can I make you feel more loved?",
    "What drives you crazy in the best way?",
    "Describe your ideal romantic getaway with me",
    "What's something you've been wanting to tell me?",
    "How do you like to be teased?",
    "What's your favorite way to initiate intimacy?",
    "Tell me what you're thinking about right now",
    "What's something that always gets you in the mood?",
  ],
  heavy: [
    "What's your wildest fantasy involving me?",
    "Tell me about a time you wanted me but couldn't have me",
    "What's the naughtiest thought you've had about me today?",
    "Describe in detail what you want to do to me right now",
    "What's something you've always wanted to try but been too shy to ask?",
    "Where on your body do you want me to kiss you most?",
    "What would you do if I was with you right now?",
    "Tell me your most secret desire",
    "How do you want me to make you feel tonight?",
    "What's the most intense moment we've shared?",
    "Describe your ultimate fantasy night with me",
    "What drives you absolutely wild about me?",
    "If there were no limits, what would you want us to explore?",
    "What's something that would surprise me about what you want?",
    "Tell me exactly how you want to be pleased",
    "What's your favorite position and why?",
    "Describe the last time you touched yourself thinking of me",
    "What's the hottest thing we've ever done together?",
    "Tell me your deepest, darkest fantasy",
    "What would you want me to do if I could control you?",
    "How rough do you like it?",
    "What's something you want to try that might shock me?",
    "Describe how you want our next time to be",
    "What's your biggest unfulfilled desire?",
    "Tell me what you want to hear me say",
    "What's the most adventurous place you want to make love?",
    "How do you want me to take control?",
    "What's something only I can do for you?",
    "Describe your perfect scenario for tonight",
    "What forbidden thought do you have about us?",
    "Tell me exactly where and how you want to be touched",
    "What would you do if there were absolutely no consequences?",
    "What's your ultimate turn on that you've never told me?",
    "How do you want to be dominated?",
    "What's the most intense thing you want us to experience?",
  ],
};

const spicyTheme = {
  gradient: ["#7f1d1d", "#991b1b", "#b91c1c"],
  header: "#450a0a",
  headerBorder: "#dc262660",
  footer: "#450a0a",
  footerBorder: "#dc262630",
  card: "#7f1d1d",
  cardBorder: "#dc262660",
  innerCard: "#991b1b",
  innerCardBorder: "#ef444480",
  text: "text-red-100",
  textMedium: "text-red-200",
  textLight: "text-red-300/60",
  textAccent: "text-red-400",
  borderAccent: "border-red-500",
  sentMessage: "#991b1b",
  receivedMessage: "#7f1d1d",
  sentText: "text-red-100",
  receivedText: "text-red-100",
};

export default function SpicyMessage() {
  const { user } = db.useAuth();
  const [message, setMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const scrollStartY = useRef(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPlusOptions, setShowPlusOptions] = useState(false);
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questionIntensity, setQuestionIntensity] = useState<
    "light" | "medium" | "heavy"
  >("light");
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [ageVerified, setAgeVerified] = useState(false);
  const [ageCheckLoaded, setAgeCheckLoaded] = useState(false);
  const [userAgeGroup, setUserAgeGroup] = useState<"teen" | "adult" | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: { $: { where: { "owner.id": user.id } } },
          choice: { $: { where: { "owner.id": user.id } } },
        }
      : {}
  );

  const userProfile = profileData?.profiles?.[0];
  const choice = profileData?.choice?.[0];

  const { data: chatData } = db.useQuery(
    user && choice && choice.activeType === "relationship"
      ? {
          relationships: { $: { where: { id: choice.activeId } } },
        }
      : {}
  );

  const activeChat = chatData?.relationships?.[0];

  const getOtherUsername = () => {
    if (!activeChat || !userProfile) return null;
    return (activeChat as any).partnerUsername;
  };

  const otherUsername = getOtherUsername();

  const roomId = useMemo(() => {
    if (!userProfile?.username || !otherUsername) return null;
    return [userProfile.username, otherUsername].sort().join("-");
  }, [userProfile?.username, otherUsername]);

  const { data: messageData } = db.useQuery(
    userProfile?.username && otherUsername && roomId
      ? {
          messages: {
            $: {
              where: {
                chatType: "spicy",
                chatId: roomId
              }
            }
          },
        }
      : {}
  );

  const messages = useMemo(() => {
    if (!messageData?.messages) return [];

    return messageData.messages
      .map((msg: any) => {
        try {
          const parsed = JSON.parse(msg.text);
          return {
            ...msg,
            text: parsed.text || msg.text,
            image: parsed.image || null,
            replyTo: parsed.replyTo || null,
            replyContent: parsed.replyContent || null,
            reactions: msg.reactions || {} as Record<string, string>,
          };
        } catch {
          return {
            ...msg,
            reactions: msg.reactions || {} as Record<string, string>
          };
        }
      })
      .sort((a: any, b: any) => a.createdAt - b.createdAt);
  }, [messageData?.messages]);

  useEffect(() => {
    if (!messages || !userProfile?.username) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.isRead && msg.receiverUsername === userProfile.username
    );

    if (unreadMessages.length > 0) {
      db.transact(
        unreadMessages.map((msg) =>
          db.tx.messages[msg.id].update({ isRead: true })
        )
      ).catch(console.error);
    }
  }, [messages, userProfile?.username]);

  useEffect(() => {
    const checkAgeVerification = async () => {
      try {
        let ageGroup = userProfile?.ageGroup || null;

        if (!ageGroup) {
          ageGroup = await AsyncStorage.getItem("ageGroup");
        }

        setUserAgeGroup(ageGroup as "teen" | "adult" | null);

        if (ageGroup === "adult") {
          const spicyVerified = await AsyncStorage.getItem("spicyAgeVerified");
          if (spicyVerified === "true") {
            setAgeVerified(true);
          }
        }
        setAgeCheckLoaded(true);
      } catch (error) {
        console.error("Error checking age verification:", error);
        setAgeCheckLoaded(true);
      }
    };
    checkAgeVerification();
  }, [userProfile]);

  const sendMessage = useCallback(async () => {
    if (!message.trim() && !selectedImage) return;
    if (!activeChat || !user || !userProfile || !otherUsername || !roomId) return;

    const messageText = message.trim();
    setMessage("");
    setSelectedImage(null);
    setReplyingTo(null);

    try {
      const messageId = id();
      const messageContent: any = {
        text: messageText || "",
        chatType: "spicy",
        chatId: roomId,
        senderUsername: userProfile.username,
        receiverUsername: otherUsername,
        createdAt: Date.now(),
        isRead: false,
      };

      if (selectedImage) {
        messageContent.text = JSON.stringify({
          text: messageText || "",
          image: selectedImage,
        });
      }

      if (replyingTo) {
        messageContent.text = JSON.stringify({
          text: messageText || "",
          image: selectedImage || null,
          replyTo: replyingTo.id,
          replyContent: replyingTo.text || "Image",
        });
      }

      await db.transact(
        db.tx.messages[messageId]
          .update(messageContent)
          .link({ sender: user.id })
      );

      try {
        const recipientResult = await db.queryOnce({
          profiles: {
            $: {
              where: { username: otherUsername },
            },
          },
        });

        const recipientProfile = recipientResult.data?.profiles?.[0];

        if (
          recipientProfile?.pushToken &&
          recipientProfile?.notificationsEnabled
        ) {
          await pushNotificationService.sendMessageNotification(
            recipientProfile.pushToken,
            userProfile.username,
            messageText || "Sent a spicy photo 🔥",
            "relationship"
          );
        }
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }, [message, selectedImage, activeChat, user, userProfile, otherUsername, roomId, replyingTo]);

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
          reactions: Object.keys(newReactions).length > 0 ? newReactions : null,
        }),
      ]);

      setShowMessageActions(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  }, [selectedMessage, userProfile?.username]);

  const deleteMessage = async () => {
    if (!selectedMessage || !user) return;

    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await db.transact(db.tx.messages[selectedMessage.id].delete());
              setShowMessageActions(false);
              setSelectedMessage(null);
            } catch (error) {
              console.error("Error deleting message:", error);
            }
          },
        },
      ]
    );
  };

  const handlePlusPress = () => {
    if (showPlusOptions) {
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(spinAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowPlusOptions(false));
    } else {
      setShowPlusOptions(true);
      Animated.parallel([
        Animated.spring(spinAnimation, {
          toValue: 1,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleOptionPress = (option: "photo" | "ai" | "questions") => {
    handlePlusPress();

    if (option === "photo") {
      setTimeout(() => pickImage(), 300);
    } else if (option === "ai") {
      Alert.alert("AI Assistant", "AI suggestions coming soon!");
    } else if (option === "questions") {
      setTimeout(() => setShowQuestionsModal(true), 300);
    }
  };

  const sendQuestion = (question: string) => {
    setMessage(question);
    setUsedQuestions((prev) => new Set(prev).add(question));
    setShowQuestionsModal(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to upload images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setSelectedImage(base64Image);
    }
  };

  const saveImageToGallery = async (imageUri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Sorry, we need gallery permissions to save images."
        );
        return;
      }

      const base64Data = imageUri.replace(/^data:image\/[a-z]+;base64,/, "");
      const fileUri =
        (documentDirectory || '') + `spicy_image_${Date.now()}.jpg`;

      await writeAsStringAsync(fileUri, base64Data, {
        encoding: 'base64' as any,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Fuzzy Spicy", asset, false);

      Alert.alert("Success", "Image saved to gallery! 🔥");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save image to gallery");
    }
  };

  const renderMessage = (msg: any, index: number) => {
    const isOwnMessage = msg.senderUsername === userProfile?.username;
    const nextMsg = messages[index + 1];
    const prevMsg = messages[index - 1];
    const showTimestamp =
      index === 0 ||
      (messages[index - 1] &&
        new Date(msg.createdAt).toDateString() !==
          new Date(messages[index - 1].createdAt).toDateString());
    const showSeen =
      isOwnMessage &&
      msg.isRead &&
      (!nextMsg || nextMsg.senderUsername !== msg.senderUsername);

    const reactions = msg.reactions || {};
    const reactionEntries = Object.entries(reactions);

    const { translateX, opacity } = getSwipeAnimation(msg.id);
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const shouldRespond =
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
        if (shouldRespond) {
          setScrollEnabled(false);
        }
        return shouldRespond;
      },
      onPanResponderGrant: () => {
        setScrollEnabled(false);
      },
      onPanResponderMove: (evt, gestureState) => {
        const validSwipe = isOwnMessage
          ? gestureState.dx < 0
          : gestureState.dx > 0;

        if (validSwipe) {
          const limitedDx = isOwnMessage
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

        const validSwipe = isOwnMessage
          ? gestureState.dx < 0
          : gestureState.dx > 0;
        const distance = Math.abs(gestureState.dx);

        if (validSwipe && distance > 40) {
          setReplyingTo(msg);

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
    });

    return (
      <View key={msg.id}>
        {showTimestamp && (
          <Text className="text-center text-pink-400/50 text-xs my-2">
            {new Date(msg.createdAt).toLocaleDateString()}
          </Text>
        )}

        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX }],
          }}
        >
          <Pressable
            onLongPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (error) {
                console.log("Haptics not available:", error);
              }
              setSelectedMessage(msg);
              setShowMessageActions(true);
            }}
            className={`${
              isOwnMessage ? "items-end" : "items-start"
            } mb-2 px-3`}
          >
            <View
              style={{
                maxWidth: "80%",
                backgroundColor: isOwnMessage
                  ? "rgba(220, 38, 38, 0.25)"
                  : "rgba(0, 0, 0, 0.3)",
                borderWidth: 1,
                borderColor: isOwnMessage
                  ? "rgba(239, 68, 68, 0.6)"
                  : "rgba(220, 38, 38, 0.5)",
                borderRadius: 16,
                borderTopRightRadius: isOwnMessage ? 4 : 16,
                borderTopLeftRadius: isOwnMessage ? 16 : 4,
              }}
              className="px-4 py-3"
            >
              {msg.replyTo && (
                <View className="bg-black/30 rounded-lg p-2 mb-2 border-l-2 border-red-400">
                  <Text className="text-pink-300/70 text-xs">Replying to</Text>
                  <Text className="text-pink-200 text-sm" numberOfLines={1}>
                    {messages.find((m: any) => m.id === msg.replyTo)?.text ||
                      "Message"}
                  </Text>
                </View>
              )}

              {msg.image && (
                <TouchableOpacity onPress={() => setViewingImage(msg.image)}>
                  <Image
                    source={{ uri: msg.image }}
                    style={{
                      width: 200,
                      height: 150,
                      borderRadius: 8,
                      marginBottom: msg.text ? 8 : 0,
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                  />
                </TouchableOpacity>
              )}

              {msg.text ? (
                <Text
                  className={
                    isOwnMessage ? "text-white font-medium" : "text-red-100"
                  }
                >
                  {msg.text}
                </Text>
              ) : null}

              <View className="flex-row items-center justify-between mt-2">
                <Text
                  className={
                    isOwnMessage
                      ? "text-red-300/70 text-xs"
                      : "text-red-400/70 text-xs"
                  }
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                {isOwnMessage && (
                  <Text className="text-red-300/50 text-xs ml-2">
                    {msg.isRead ? "✓✓" : "✓"}
                  </Text>
                )}
              </View>
            </View>

            {reactionEntries.length > 0 && (
              <View className="flex-row mt-1">
                {reactionEntries.map(([username, emoji]) => (
                  <View
                    key={username}
                    className="bg-black/30 rounded-full px-2 py-1 mr-1"
                  >
                    <Text className="text-xs">{String(emoji)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Animated.View>

        {showSeen && (
          <Text className="text-red-300/30 text-xs mt-1 mr-4 text-right">
            Seen
          </Text>
        )}
      </View>
    );
  };

  const handleAgeConfirmation = async () => {
    try {
      await AsyncStorage.setItem("spicyAgeVerified", "true");
      setAgeVerified(true);
    } catch (error) {
      console.error("Error saving age verification:", error);
      setAgeVerified(true);
    }
  };

  if (!ageCheckLoaded) {
    return null;
  }

  if (userAgeGroup === "teen") {
    return (
      <View className="flex-1">
        <GradientBackground colors={spicyTheme.gradient} />
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-red-950 rounded-3xl p-8 border border-red-600 w-full max-w-sm">
            <Text className="text-6xl text-center mb-4">🔒</Text>
            <Text className="text-red-100 text-2xl font-bold text-center mb-4">
              Content Restricted
            </Text>
            <Text className="text-red-300 text-center mb-6">
              This feature is only available for users 18 and older.
            </Text>
            <Text className="text-red-200/80 text-center mb-8">
              As a teen user, you have access to all other amazing features to connect with your friends and partners in a safe environment!
            </Text>

            <TouchableOpacity
              onPress={() => safeNavigate.back()}
              className="py-4 rounded-xl bg-red-700"
            >
              <Text className="text-white text-center font-bold">
                Go Back
              </Text>
            </TouchableOpacity>

            <Text className="text-red-500/50 text-xs text-center mt-6">
              We take safety seriously and ensure age-appropriate content for all users.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!ageVerified && userAgeGroup === "adult") {
    return (
      <View className="flex-1">
        <GradientBackground colors={spicyTheme.gradient} />
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-red-950 rounded-3xl p-8 border border-red-600 w-full max-w-sm">
            <Text className="text-6xl text-center mb-4">🔥</Text>
            <Text className="text-red-100 text-2xl font-bold text-center mb-4">
              Age Verification
            </Text>
            <Text className="text-red-300 text-center mb-8">
              This content is for adults only. You must be 18 years or older to
              continue.
            </Text>

            <Text className="text-red-400 text-sm text-center mb-6">
              Are you 18 years or older?
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => safeNavigate.back()}
                className="flex-1 py-4 rounded-xl border border-red-600"
                style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
              >
                <Text className="text-red-400 text-center font-semibold">
                  No, Go Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAgeConfirmation}
                className="flex-1 py-4 rounded-xl bg-red-700"
              >
                <Text className="text-white text-center font-bold">
                  Yes, I'm 18+
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-red-500/50 text-xs text-center mt-6">
              By continuing, you confirm that you are legally an adult in your
              jurisdiction.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <GradientBackground colors={spicyTheme.gradient} />

          <View
            style={{
              backgroundColor: spicyTheme.header,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
              borderWidth: 1,
              borderColor: spicyTheme.headerBorder,
              paddingTop: 50,
            }}
            className="shadow-xl"
          >
            <View className="h-28">
              <View className="flex-row items-center h-full px-4">
                <TouchableOpacity
                  onPress={() => safeNavigate.back()}
                  className="bg-red-950 rounded-full border border-red-600 items-center justify-center"
                  style={{ width: 40, height: 40 }}
                >
                  <Text className="text-red-200 text-lg font-bold">‹</Text>
                </TouchableOpacity>

                <View className="flex-1 flex-row items-center justify-center">
                  {activeChat && (
                    <View className="w-16 h-16 rounded-full bg-red-950 items-center justify-center mr-3 border-2 border-red-600">
                      {(activeChat as any).photo ? (
                        <Image
                          source={{ uri: (activeChat as any).photo }}
                          style={{ width: 64, height: 64, borderRadius: 32 }}
                        />
                      ) : (
                        <Text className="text-3xl">
                          {(activeChat as any).emoji || "💕"}
                        </Text>
                      )}
                    </View>
                  )}
                  <View>
                    <Text className="text-2xl text-red-100 font-bold">
                      {choice?.activeName || "Spicy Chat"}
                    </Text>
                    <Text className="text-red-400/80 text-sm">
                      Private & Encrypted
                    </Text>
                  </View>
                </View>

                <View className="w-14" />
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: false })
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
          >
            {messages.length === 0 ? (
              <View className="flex-1 items-center justify-center px-8 mt-20">
                <Text className="text-6xl mb-4">🔥</Text>
                <Text className="text-pink-100 text-xl font-bold text-center mb-2">
                  Start Your Spicy Conversation
                </Text>
                <Text className="text-pink-300/60 text-center">
                  Share your desires in this private space...
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}
          </ScrollView>

          {replyingTo && (
            <View className="bg-red-900/30 px-4 py-2 flex-row items-center justify-between border-t border-red-500/30">
              <View className="flex-1">
                <Text className="text-pink-300/60 text-xs">Replying to</Text>
                <Text className="text-pink-200 text-sm" numberOfLines={1}>
                  {replyingTo.text || "Image"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Text className="text-red-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedImage && (
            <View className="bg-red-900/30 px-4 py-2 flex-row items-center justify-between border-t border-red-500/30">
              <Image
                source={{ uri: selectedImage }}
                style={{ width: 60, height: 60, borderRadius: 8 }}
              />
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Text className="text-red-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="px-4 pb-8 pt-3">
            <View className="flex-row items-center">
              <View className="relative" style={{ width: 40 }}>
                {showPlusOptions && (
                  <View className="absolute bottom-12 left-0">
                    <Animated.View
                      style={{
                        opacity: fadeAnimation,
                        transform: [
                          { scale: scaleAnimation },
                          {
                            translateY: scaleAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleOptionPress("questions")}
                        className="bg-red-900 rounded-full mb-2 border border-red-600 items-center justify-center"
                        style={{ width: 40, height: 40 }}
                      >
                        <Text className="text-red-100 text-lg">❓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOptionPress("ai")}
                        className="bg-red-900 rounded-full mb-2 border border-red-600 items-center justify-center"
                        style={{ width: 40, height: 40 }}
                      >
                        <Text className="text-red-100 text-xs font-bold">
                          AI
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOptionPress("photo")}
                        className="bg-red-900 rounded-full mb-2 border border-red-600 items-center justify-center"
                        style={{ width: 40, height: 40 }}
                      >
                        <Text className="text-red-100 text-lg">📸</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                )}
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: spinAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "135deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    onPress={handlePlusPress}
                    className="rounded-full border border-red-800 items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: showPlusOptions
                        ? "#991b1b"
                        : "rgba(0,0,0,0.3)",
                    }}
                  >
                    <Text
                      className="text-xl font-bold"
                      style={{ color: showPlusOptions ? "#fef2f2" : "#dc2626" }}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <View className="mr-2" />

              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type something spicy..."
                placeholderTextColor="#ef444460"
                className="flex-1 text-red-100 px-4 py-3 rounded-full mr-2 border border-red-800"
                style={{ backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1 }}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                onPress={sendMessage}
                disabled={!message.trim() && !selectedImage}
                className="rounded-full p-3 border border-red-800"
                style={{
                  backgroundColor: "rgba(0,0,0,0.3)",
                  opacity: !message.trim() && !selectedImage ? 0.5 : 1,
                }}
              >
                <Text className="text-white font-bold">🔥</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Modal
            visible={showMessageActions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowMessageActions(false)}
          >
            <TouchableWithoutFeedback
              onPress={() => setShowMessageActions(false)}
            >
              <View className="flex-1 justify-end bg-black/50">
                <View className="bg-red-950 rounded-t-3xl p-6 border-t border-red-500/30">
                  <View className="flex-row justify-around mb-4">
                    {quickReactions.map((reaction) => (
                      <TouchableOpacity
                        key={reaction}
                        onPress={() => handleReaction(reaction)}
                        className="p-2"
                      >
                        <Text className="text-3xl">{reaction}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setReplyingTo(selectedMessage);
                      setShowMessageActions(false);
                    }}
                    className="bg-red-900/30 p-4 rounded-xl mb-2 border border-red-500/30"
                  >
                    <Text className="text-pink-100 text-center">Reply</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(selectedMessage?.text || "");
                      setShowMessageActions(false);
                      Alert.alert("Copied", "Message copied to clipboard");
                    }}
                    className="bg-red-900/30 p-4 rounded-xl mb-2 border border-red-500/30"
                  >
                    <Text className="text-pink-100 text-center">Copy</Text>
                  </TouchableOpacity>

                  {selectedMessage?.senderUsername ===
                    userProfile?.username && (
                    <TouchableOpacity
                      onPress={deleteMessage}
                      className="bg-red-600/30 p-4 rounded-xl border border-red-500"
                    >
                      <Text className="text-red-300 text-center">Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <Modal
            visible={!!viewingImage}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setViewingImage(null)}
          >
            <View className="flex-1 bg-black/95">
              <TouchableOpacity
                onPress={() => setViewingImage(null)}
                className="absolute top-14 right-4 z-10 bg-red-900/50 rounded-full p-3"
              >
                <Text className="text-white text-xl">✕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => viewingImage && saveImageToGallery(viewingImage)}
                className="absolute top-14 left-4 z-10 bg-red-900/50 rounded-full p-3"
              >
                <Text className="text-white text-xl">💾</Text>
              </TouchableOpacity>

              <View className="flex-1 justify-center items-center">
                {viewingImage && (
                  <Image
                    source={{ uri: viewingImage }}
                    style={{
                      width: "90%",
                      height: "70%",
                      resizeMode: "contain",
                    }}
                  />
                )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={showQuestionsModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowQuestionsModal(false)}
          >
            <View className="flex-1 justify-end bg-black/50">
              <View
                className="bg-red-950 rounded-t-3xl border-t border-red-600"
                style={{ maxHeight: "80%" }}
              >
                <View className="p-6 border-b border-red-800">
                  <Text className="text-red-100 text-2xl font-bold text-center mb-2">
                    Spicy Questions
                  </Text>
                  <Text className="text-red-400 text-sm text-center">
                    Want to answer intriguing questions for couples?
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowQuestionsModal(false)}
                    className="absolute top-6 right-6"
                  >
                    <Text className="text-red-400 text-xl">✕</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row p-4 border-b border-red-800">
                  <TouchableOpacity
                    onPress={() => setQuestionIntensity("light")}
                    className="flex-1 py-3 rounded-l-xl border border-red-600"
                    style={{
                      backgroundColor:
                        questionIntensity === "light"
                          ? "#991b1b"
                          : "rgba(0,0,0,0.3)",
                      borderRightWidth: 0,
                    }}
                  >
                    <Text className="text-center text-red-100">🌸 Light</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestionIntensity("medium")}
                    className="flex-1 py-3 border-y border-red-600"
                    style={{
                      backgroundColor:
                        questionIntensity === "medium"
                          ? "#991b1b"
                          : "rgba(0,0,0,0.3)",
                    }}
                  >
                    <Text className="text-center text-red-100">🔥 Medium</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestionIntensity("heavy")}
                    className="flex-1 py-3 rounded-r-xl border border-red-600"
                    style={{
                      backgroundColor:
                        questionIntensity === "heavy"
                          ? "#991b1b"
                          : "rgba(0,0,0,0.3)",
                      borderLeftWidth: 0,
                    }}
                  >
                    <Text className="text-center text-red-100">🌶️ Heavy</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  className="p-4"
                  showsVerticalScrollIndicator={false}
                >
                  {spicyQuestions[questionIntensity].map((question, index) => {
                    const isUsed = usedQuestions.has(question);
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => !isUsed && sendQuestion(question)}
                        className="border rounded-xl p-4 mb-3"
                        style={{
                          backgroundColor: isUsed
                            ? "rgba(0,0,0,0.6)"
                            : "rgba(0,0,0,0.3)",
                          borderColor: isUsed ? "#991b1b40" : "#991b1b",
                          opacity: isUsed ? 0.5 : 1,
                        }}
                      >
                        <View className="flex-row items-start">
                          {isUsed && (
                            <Text className="text-red-600 mr-2">✓</Text>
                          )}
                          <Text
                            className={
                              isUsed
                                ? "text-red-400/60 flex-1"
                                : "text-red-100 flex-1"
                            }
                          >
                            {question}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View className="h-20" />
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
