import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  PanResponder,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { BlurView } from 'expo-blur';
import Svg, { Path, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg";
import { tx, id } from "@instantdb/react-native";
import db from "../utils/db";
import { GradientBackground, themes } from "@/utils/shared";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PathData {
  path: string;
  timestamp: number;
  userId: string;
}

export default function FingerTap() {
  const { user, isLoading } = db.useAuth();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [myPaths, setMyPaths] = useState<PathData[]>([]);
  const [partnerPaths, setPartnerPaths] = useState<PathData[]>([]);
  const [username, setUsername] = useState<string>("");
  const [partnerUsername, setPartnerUsername] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const pathRef = useRef<string>("");
  const lastPoint = useRef<{x: number, y: number} | null>(null);


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
      setIsConnected(true);
    } else if (!isLoading && !activeChat) {
      Alert.alert("No Active Chat", "Please select a chat first");
      router.back();
    }
  }, [userProfile, otherUsername, activeChat, isLoading]);


  const roomId = username && partnerUsername
    ? [username, partnerUsername].sort().join("-")
    : null;


  const { data: drawingMessages } = db.useQuery(
    username && partnerUsername ? {
      messages: {
        $: {
          where: {
            chatType: "finger-drawing",
            chatId: roomId,
            senderUsername: partnerUsername,
          },
          order: {
            serverCreatedAt: "desc",
          },
          limit: 3,
        },
      },
    } : {}
  );


  useEffect(() => {
    if (drawingMessages?.messages) {
      const newPaths = drawingMessages.messages.map((msg: any) => {
        const pathData = JSON.parse(msg.text);
        return {
          path: pathData.path,
          timestamp: msg.createdAt,
          userId: msg.senderUsername,
        };
      });

      setPartnerPaths(newPaths.reverse().slice(-3));
    }
  }, [drawingMessages?.messages]);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const normalizedX = (locationX / screenWidth) * 100;
        const normalizedY = (locationY / (screenHeight - 200)) * 100;

        const newPath = `M ${normalizedX.toFixed(1)} ${normalizedY.toFixed(1)}`;
        pathRef.current = newPath;
        setCurrentPath(newPath);
        setIsDrawing(true);
        lastPoint.current = { x: normalizedX, y: normalizedY };
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const normalizedX = (locationX / screenWidth) * 100;
        const normalizedY = (locationY / (screenHeight - 200)) * 100;

        if (lastPoint.current) {
          const distance = Math.sqrt(
            Math.pow(normalizedX - lastPoint.current.x, 2) +
            Math.pow(normalizedY - lastPoint.current.y, 2)
          );
          if (distance < 1.5) return;
        }

        const updatedPath = `${pathRef.current} L ${normalizedX.toFixed(1)} ${normalizedY.toFixed(1)}`;
        pathRef.current = updatedPath;
        setCurrentPath(updatedPath);
        lastPoint.current = { x: normalizedX, y: normalizedY };
      },

      onPanResponderRelease: async () => {
        if (!username || !partnerUsername || !roomId || !pathRef.current) {
          setCurrentPath("");
          setIsDrawing(false);
          return;
        }

        const newPath: PathData = {
          path: pathRef.current,
          timestamp: Date.now(),
          userId: username,
        };


        setMyPaths(prev => [...prev, newPath].slice(-3));

        try {
          await db.transact([
            tx.messages[id()].update({
              text: JSON.stringify({ path: pathRef.current }),
              chatType: "finger-drawing",
              chatId: roomId,
              senderUsername: username,
              receiverUsername: partnerUsername,
              createdAt: Date.now(),
            }),
          ]);
        } catch (error) {
          console.error("Error sending drawing:", error);
        }

        setCurrentPath("");
        pathRef.current = "";
        setIsDrawing(false);
        lastPoint.current = null;
      },

      onPanResponderTerminate: () => {
        setCurrentPath("");
        pathRef.current = "";
        setIsDrawing(false);
        lastPoint.current = null;
      },
    })
  ).current;

  const clearDrawings = () => {
    setMyPaths([]);
  };

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

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />
      <GradientBackground colors={theme.gradient} />

      
      <BlurView intensity={20} tint="dark" className="absolute top-0 left-0 right-0 z-10">
        <View
          style={{
            backgroundColor: theme.header,
            borderBottomWidth: 1,
            borderBottomColor: theme.headerBorder,
          }}
          className="pt-14 pb-4"
        >
          <View className="flex-row items-center px-4">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Text className={`text-3xl ${theme.textLight}`}>‹</Text>
            </TouchableOpacity>

            <View className="flex-1 flex-row items-center">
              {displayPhoto ? (
                <Image
                  source={{ uri: displayPhoto }}
                  className="w-10 h-10 rounded-full mr-3"
                />
              ) : displayEmoji ? (
                <Text className="text-3xl mr-3">{displayEmoji}</Text>
              ) : (
                <View className="w-10 h-10 rounded-full bg-white/10 mr-3" />
              )}

              <View className="flex-1">
                <Text className={`text-lg font-semibold ${theme.text}`}>
                  {displayName || "Finger Draw"}
                </Text>
                <Text className={`text-xs ${theme.textLight}`}>
                  Draw together in real-time
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={clearDrawings} className="ml-4">
              <Text className={`text-sm ${theme.textAccent}`}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
      >
        <View className="flex-1 mt-24">
          <View
            className="flex-1"
            {...panResponder.panHandlers}
          >
            <Svg
              width={screenWidth}
              height={screenHeight - 200}
              viewBox={`0 0 100 ${((screenHeight - 200) / screenWidth) * 100}`}
              style={{ backgroundColor: 'transparent' }}
            >
              <Defs>
                <Filter id="whiteGlow">
                  <FeGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <FeMerge>
                    <FeMergeNode in="coloredBlur"/>
                    <FeMergeNode in="SourceGraphic"/>
                  </FeMerge>
                </Filter>
              </Defs>

              
              {(() => {

                const allPaths = [...partnerPaths, ...myPaths]
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .slice(-3);

                return allPaths.map((pathData, index) => {

                  const opacity = index === 0 && allPaths.length === 3 ? 0.5 : 0.9;

                  return (
                    <React.Fragment key={`${pathData.userId}-${pathData.timestamp}-${index}`}>
                      
                      <Path
                        d={pathData.path}
                        stroke="white"
                        strokeWidth={4}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={opacity * 0.22}
                      />
                      
                      <Path
                        d={pathData.path}
                        stroke="white"
                        strokeWidth={2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={opacity}
                        filter="url(#whiteGlow)"
                      />
                    </React.Fragment>
                  );
                });
              })()}

              
              {currentPath && (
                <>
                  
                  <Path
                    d={currentPath}
                    stroke="white"
                    strokeWidth={6}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  
                  <Path
                    d={currentPath}
                    stroke="white"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={1}
                    filter="url(#whiteGlow)"
                  />
                </>
              )}
            </Svg>

            
            {myPaths.length === 0 && partnerPaths.length === 0 && !isDrawing && (
              <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                <Text className={`text-lg ${theme.textLight} opacity-50`}>
                  Touch to draw
                </Text>
                <Text className={`text-sm mt-2 ${theme.textLight} opacity-30`}>
                  Both partners see the same canvas
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}