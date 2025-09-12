import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  PanResponder,
  Image,
} from "react-native";
import { safeNavigate } from "@/utils/navigation";
import db from "@/utils/db";
import { GradientBackground, themes } from "@/utils/shared";
import { id as instantId } from "@instantdb/react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface TouchPoint {
  x: number;
  y: number;
  id: string;
  timestamp: number;
}

export default function FingerTap() {
  const { user, isLoading } = db.useAuth();
  const [currentTouch, setCurrentTouch] = useState<TouchPoint | null>(null);
  const [username, setUsername] = useState<string>("");
  const [partnerUsername, setPartnerUsername] = useState<string>("");
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

  const theme = themes[choice?.activeType] || themes.relationship;

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

  useEffect(() => {
    if (userProfile?.username) {
      setUsername(userProfile.username);
    }

    if (otherUsername) {
      setPartnerUsername(otherUsername);
    }
  }, [userProfile, otherUsername]);

  const roomId = username && partnerUsername
    ? [username, partnerUsername].sort().join("-")
    : null;

  const actualPeers = {};
  const actualPublishPresence = () => {};
  
  const partnerTouches = React.useMemo(() => {
    if (!actualPeers || !partnerUsername) return [];
    
    const now = Date.now();
    const touches: TouchPoint[] = [];
    
    Object.values(actualPeers).forEach((peerPresence: any) => {
      if (peerPresence.username === partnerUsername && peerPresence.touches) {
        const peerTouches = peerPresence.touches as TouchPoint[];
        touches.push(...peerTouches.filter(t => now - t.timestamp < 3000));
      }
    });
    
    return touches;
  }, [actualPeers, partnerUsername]);

  useEffect(() => {
    const fadeInterval = setInterval(() => {
      const now = Date.now();
      if (currentTouch && now - currentTouch.timestamp > 3000) {
        setCurrentTouch(null);
      }
    }, 100);

    return () => clearInterval(fadeInterval);
  }, [currentTouch]);
  
  useEffect(() => {
    if (username) {
      const now = Date.now();
      const recentTouches = currentTouch ? [currentTouch] : [];
    }
  }, [username, currentTouch]);

  const panResponder = React.useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const touchId = instantId();
        const touch: TouchPoint = {
          x: locationX,
          y: locationY,
          id: touchId,
          timestamp: Date.now()
        };
        
        setCurrentTouch(touch);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const touchId = instantId();
        const touch: TouchPoint = {
          x: locationX,
          y: locationY,
          id: touchId,
          timestamp: Date.now()
        };
        
        setCurrentTouch(touch);
      },

      onPanResponderRelease: () => {
        setCurrentTouch(null);
      },
    }), []);

  if (isLoading || !user) {
    return (
      <View className="flex-1">
        <StatusBar barStyle="light-content" />
        <GradientBackground colors={theme.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading...</Text>
        </View>
      </View>
    );
  }

  if (!choice || !activeChat) {
    return (
      <View className="flex-1">
        <StatusBar barStyle="light-content" />
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
            <TouchableOpacity
              onPress={() => safeNavigate.back()}
              className="bg-white/10 rounded-full w-10 h-10 items-center justify-center ml-4 border border-white/20"
            >
              <Text className="text-white text-lg font-bold">‹</Text>
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-2xl text-white font-bold">Finger Tap</Text>
            </View>
            <View className="w-10 h-10 mr-4" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-xl text-center mb-4">No Chat Selected</Text>
          <Text className="text-white/60 text-center mb-6">
            Please select a chat from the home screen first
          </Text>
          <TouchableOpacity
            onPress={() => safeNavigate.back()}
            className="bg-white/10 rounded-xl px-6 py-3 border border-white/20"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayName = choice?.activeType === "relationship"
    ? (activeChat as any)?.name
    : choice?.activeType === "friendship"
    ? (activeChat as any)?.name
    : choice?.activeType === "connection"
    ? otherUsername
    : "Chat";

  const displayEmoji = choice?.activeType === "relationship"
    ? (activeChat as any)?.emoji
    : choice?.activeType === "friendship"
    ? (activeChat as any)?.emoji
    : choice?.activeType === "connection"
    ? (activeChat as any)?.senderUsername === userProfile?.username
      ? (activeChat as any)?.receiverEmoji
      : (activeChat as any)?.senderEmoji
    : null;

  const displayPhoto = choice?.activeType === "relationship"
    ? (activeChat as any)?.photo
    : choice?.activeType === "friendship"
    ? (activeChat as any)?.photo
    : choice?.activeType === "connection"
    ? (activeChat as any)?.senderUsername === userProfile?.username
      ? (activeChat as any)?.receiverPhoto
      : (activeChat as any)?.senderPhoto
    : null;

  const getOpacity = (timestamp: number) => {
    const age = Date.now() - timestamp;
    return Math.max(0, 1 - (age / 3000));
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />
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
          <View className="flex-row items-center w-full">
            <TouchableOpacity
              onPress={() => safeNavigate.back()}
              className="bg-white/10 rounded-full w-10 h-10 items-center justify-center ml-4 mr-4 border border-white/20"
            >
              <Text className="text-white text-lg font-bold">‹</Text>
            </TouchableOpacity>
            
            <View className="flex-row items-center flex-1 justify-center pr-14">
              <TouchableOpacity
                className={`w-24 h-24 rounded-full border-4 ${theme.borderAccent}`}
                style={{ overflow: "visible" }}
                disabled
              >
                {displayPhoto ? (
                  <Image
                    source={{ uri: displayPhoto }}
                    style={{ width: "100%", height: "100%", borderRadius: 48 }}
                  />
                ) : (
                  <View className="w-full h-full bg-white/10 items-center justify-center rounded-full">
                    <Text
                      className="text-5xl"
                      style={{ includeFontPadding: false, lineHeight: 60 }}
                    >
                      {displayEmoji || "💕"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View className="ml-3">
                <Text className="text-4xl text-white font-bold">
                  {displayName || "Finger Tap"}
                </Text>
                <Text className={`text-sm ${theme.textLight}`}>
                  Touch together 💕
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View 
        className="flex-1"
        {...panResponder.panHandlers}
      >
        {partnerTouches.map((touch) => (
          <View
            key={touch.id}
            className="absolute"
            style={{
              left: touch.x - 30,
              top: touch.y - 30,
              opacity: getOpacity(touch.timestamp),
            }}
          >
            <View 
              className="w-[60px] h-[60px] rounded-full"
              style={{
                backgroundColor: theme.gradient[1],
                shadowColor: theme.gradient[1],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 20,
              }}
            />
            <Text className="absolute inset-0 text-3xl text-center pt-3">
              💕
            </Text>
          </View>
        ))}


        {currentTouch && (
          <View
            className="absolute"
            style={{
              left: currentTouch.x - 35,
              top: currentTouch.y - 35,
            }}
          >
            <View 
              className="w-[70px] h-[70px] rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                shadowColor: '#fff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 30,
                elevation: 10,
              }}
            />
            <Text className="absolute inset-0 text-4xl text-center pt-3">
              ✨
            </Text>
          </View>
        )}

        {partnerTouches.length === 0 && !currentTouch && (
          <View 
            className="absolute inset-0 items-center justify-center" 
            pointerEvents="none"
          >
            <Text 
              className={`text-2xl font-medium ${theme.text}`}
              style={{ opacity: 0.6 }}
            >
              Touch anywhere
            </Text>
            <Text 
              className={`text-sm mt-2 ${theme.textLight}`}
              style={{ opacity: 0.4 }}
            >
              Your partner sees your touches in real-time
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}