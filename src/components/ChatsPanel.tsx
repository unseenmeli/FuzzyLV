import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
} from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";
import { id } from "@instantdb/react-native";
import { BlurView } from "expo-blur";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ChatsPanelProps {
  user: any;
  userProfile: any;
  onSelectChat: (type: string, chatId: string, name: string, emoji: string) => void;
  onAddChat: () => void;
  onBack: () => void;
}

export default function ChatsPanel({ user, userProfile, onSelectChat, onAddChat, onBack }: ChatsPanelProps) {
  const [addConnectionModal, setAddConnectionModal] = useState(false);
  const [connectionCode, setConnectionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const theme = themes.group;

  const { data } = db.useQuery(
    user && userProfile
      ? {
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
          invitations: {
            $: {
              where: {
                or: [
                  { senderUsername: userProfile.username },
                  { receiverUsername: userProfile.username },
                ],
              },
            },
          },
          relationships: {
            $: {
              where: { "owner.id": user.id },
            },
          },
          friendships: {
            $: {
              where: { "owner.id": user.id },
            },
          },
        }
      : {}
  );

  const pendingConnections = (data?.connections || []).filter(
    (c: any) => c.status === "pending" && c.receiverUsername === userProfile?.username
  );
  
  const pendingInvitations = (data?.invitations || []).filter(
    (i: any) => i.status === "pending" && i.receiverUsername === userProfile?.username
  );
  
  const sentInvitations = (data?.invitations || []).filter(
    (i: any) => i.status === "pending" && i.senderUsername === userProfile?.username
  );

  const relationships = React.useMemo(() => {
    const rels = data?.relationships || [];
    const seen = new Set();
    return rels.filter((rel: any) => {
      const key = rel.partnerUsername || rel.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.relationships]);
  
  const friendships = React.useMemo(() => {
    const friends = data?.friendships || [];
    const seen = new Set();
    return friends.filter((friend: any) => {
      const key = friend.friendUsername || friend.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.friendships]);

  const connections = (data?.connections || []).filter((c: any) => {
    if (c.status !== "accepted") return false;
    const otherUsername = c.senderUsername === userProfile?.username
      ? c.receiverUsername : c.senderUsername;
    const hasRelationship = relationships.some(
      (rel: any) => rel.partnerUsername === otherUsername
    );
    const hasFriendship = friendships.some(
      (friend: any) => friend.friendUsername === otherUsername
    );
    return !hasRelationship && !hasFriendship;
  });

  useEffect(() => {
    if (data !== undefined) {
      setIsLoadingData(false);
    }
  }, [data]);

  const handleAddConnection = async () => {
    const cleanCode = connectionCode.replace(/-/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid code (6 characters)");
      return;
    }

    if (!userProfile) {
      Alert.alert("Error", "Profile not found");
      return;
    }

    setLoading(true);
    try {
      const { data: targetData } = await db.queryOnce({
        profiles: {
          $: {
            where: { friendCode: cleanCode.toUpperCase() },
          },
        },
      });

      const targetProfile = targetData?.profiles?.[0];
      if (!targetProfile) {
        Alert.alert("Error", "User not found with this code");
        return;
      }

      if (targetProfile.username === userProfile.username) {
        Alert.alert("Error", "You cannot add yourself");
        return;
      }

      const connectionId = id();
      await db.transact(
        db.tx.connections[connectionId]
          .update({
            status: "pending",
            senderUsername: userProfile.username,
            receiverUsername: targetProfile.username,
            createdAt: Date.now(),
          })
          .link({ sender: user.id })
      );

      Alert.alert("Success", "Connection request sent!");
      setConnectionCode("");
      setAddConnectionModal(false);
    } catch (error) {
      console.error("Error adding connection:", error);
      Alert.alert("Error", "Failed to send connection request");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      await db.transact(
        db.tx.connections[connectionId].update({
          status: "accepted",
          acceptedAt: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error accepting connection:", error);
      Alert.alert("Error", "Failed to accept connection");
    }
  };

  const handleAcceptInvitation = async (invite: any) => {
    if (!user || !userProfile) return;

    try {
      if (invite.type === "relationship") {
        const chatId = id();
        await db.transact([
          db.tx.invitations[invite.id].update({
            status: "accepted",
            respondedAt: Date.now(),
          }),
          db.tx.relationships[chatId]
            .update({
              name: invite.senderUsername || "Partner",
              type: "romantic",
              emoji: "💕",
              partnerUsername: invite.senderUsername,
              createdAt: Date.now(),
            })
            .link({ owner: user.id }),
        ]);
      } else if (invite.type === "friendship") {
        const chatId = id();
        await db.transact([
          db.tx.invitations[invite.id].update({
            status: "accepted",
            respondedAt: Date.now(),
          }),
          db.tx.friendships[chatId]
            .update({
              name: invite.senderUsername || "Friend",
              type: "friend",
              emoji: invite.friendEmoji || "😊",
              friendUsername: invite.senderUsername,
              status: "active",
              createdAt: Date.now(),
            })
            .link({ owner: user.id }),
        ]);
      }
      Alert.alert("Success", `${invite.type} invitation accepted!`);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept invitation");
    }
  };

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
          height: 170,
        }}
        className="shadow-xl"
      >
        <View className="flex-row items-center justify-between h-full px-4">
          <TouchableOpacity
            onPress={onBack}
            className="bg-white/10 rounded-full w-10 h-10 items-center justify-center border border-white/20 z-10"
          >
            <Text className="text-white text-lg font-bold">‹</Text>
          </TouchableOpacity>
          <Text className="text-3xl text-white font-bold absolute left-0 right-0 text-center" pointerEvents="none">
            Chats
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setAddConnectionModal(true)}
              className="bg-white/10 rounded-full w-10 h-10 items-center justify-center border border-white/20"
            >
              <Text className="text-white text-lg font-bold">+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAddChat}
              className="bg-white/10 rounded-full px-4 py-2 border border-white/20"
            >
              <Text className="text-white text-sm font-bold">Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {isLoadingData ? (
          <View className="flex-1 items-center justify-center py-20">
            <LoadingSpinner message="Loading chats..." color="white" />
          </View>
        ) : (
          <>
            {/* Relationships */}
            {relationships.length > 0 && (
              <View className="w-full items-center my-6">
                <Text className="text-2xl font-bold p-2 text-white/90 mb-3">
                  Relationships
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
                  {relationships.map((rel: any) => (
                    <TouchableOpacity
                      key={rel.id}
                      style={{ backgroundColor: theme.innerCard }}
                      className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                      onPress={() => onSelectChat("relationship", rel.id, rel.name, rel.emoji || "💕")}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-3xl mr-3">{rel.emoji || "💕"}</Text>
                        <View>
                          <Text className="text-white font-semibold">{rel.name}</Text>
                          <Text className="text-white/60 text-sm">
                            {rel.mood || "In a relationship"}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-white/80 text-2xl">›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Friends */}
            {friendships.length > 0 && (
              <View className="w-full items-center my-6">
                <Text className="text-2xl font-bold p-2 text-white/90 mb-3">Friends</Text>
                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                  }}
                  className="w-full p-5 shadow-xl"
                >
                  {friendships.map((friend: any) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={{ backgroundColor: theme.innerCard }}
                      className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                      onPress={() => onSelectChat("friendship", friend.id, friend.name, friend.emoji || "😊")}
                    >
                      <View className="flex-row items-center">
                        {friend.photo ? (
                          <Image
                            source={{ uri: friend.photo }}
                            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                          />
                        ) : (
                          <Text className="text-3xl mr-3">{friend.emoji || "😊"}</Text>
                        )}
                        <View>
                          <Text className="text-white font-semibold">{friend.name}</Text>
                          <Text className="text-white/60 text-sm">{friend.status || "Active"}</Text>
                        </View>
                      </View>
                      <Text className="text-white/80 text-2xl">›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Connections */}
            {connections.length > 0 && (
              <View className="w-full items-center my-6">
                <Text className="text-2xl font-bold p-2 text-white/90 mb-3">Connections</Text>
                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                  }}
                  className="w-full p-5 shadow-xl"
                >
                  {connections.map((conn: any) => {
                    const otherUsername =
                      conn.senderUsername === userProfile?.username
                        ? conn.receiverUsername
                        : conn.senderUsername;
                    return (
                      <TouchableOpacity
                        key={conn.id}
                        style={{ backgroundColor: theme.innerCard }}
                        className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                        onPress={() => onSelectChat("connection", conn.id, otherUsername, "🔗")}
                      >
                        <View className="flex-row items-center">
                          <Text className="text-3xl mr-3">🔗</Text>
                          <View>
                            <Text className="text-white font-semibold">{otherUsername}</Text>
                            <Text className="text-white/60 text-sm">Connected • Tap to chat</Text>
                          </View>
                        </View>
                        <Text className="text-white/80 text-2xl">›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="h-24" />
          </>
        )}
      </ScrollView>

      {/* Add Connection Modal */}
      <Modal
        visible={addConnectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddConnectionModal(false)}
      >
        <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
          <View className="flex-1 justify-center items-center">
            <View
              style={{ backgroundColor: theme.header }}
              className="rounded-2xl p-6 w-80 border border-white/20"
            >
              <Text className="text-white text-xl font-bold mb-4">Add Connection</Text>
              <Text className="text-white/80 mb-4">Enter friend's code</Text>
              <TextInput
                className="bg-white/10 text-white px-4 py-3 rounded-xl mb-4 text-center text-lg tracking-widest"
                placeholder="XXX-XXX"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={connectionCode}
                onChangeText={setConnectionCode}
                maxLength={7}
                autoCapitalize="characters"
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setConnectionCode("");
                    setAddConnectionModal(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-white/20"
                >
                  <Text className="text-white text-center">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddConnection}
                  disabled={loading}
                  className="flex-1 bg-green-500 py-3 rounded-xl"
                >
                  <Text className="text-white font-bold text-center">
                    {loading ? "Sending..." : "Send Request"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}