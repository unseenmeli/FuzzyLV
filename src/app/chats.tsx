import { useState, useEffect } from "react";
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
import { router } from "expo-router";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";

export default function Chats() {
  const { user } = db.useAuth();
  const [addConnectionModal, setAddConnectionModal] = useState(false);
  const [connectionCode, setConnectionCode] = useState("");
  const [loading, setLoading] = useState(false);

  const theme = themes.group;

  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: {
            $: {
              where: { "owner.id": user.id },
            },
          },
        }
      : {}
  );
  const userProfile = profileData?.profiles?.[0];

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
          groups: {
            $: {
              where: { "members.id": user.id },
            },
          },
        }
      : {}
  );

  const pendingConnections = (data?.connections || []).filter(
    (c) =>
      c.status === "pending" && c.receiverUsername === userProfile?.username
  );
  const pendingInvitations = (data?.invitations || []).filter(
    (i) =>
      i.status === "pending" && i.receiverUsername === userProfile?.username
  );
  const relationships = data?.relationships || [];
  const friendships = data?.friendships || [];

  const connections = (data?.connections || []).filter((c) => {
    if (c.status !== "accepted") return false;

    const otherUsername =
      c.senderUsername === userProfile?.username
        ? c.receiverUsername
        : c.senderUsername;

    const hasRelationship = relationships.some(
      (rel) => rel.partnerUsername === otherUsername
    );
    const hasFriendship = friendships.some(
      (friend) => friend.friendUsername === otherUsername
    );

    return !hasRelationship && !hasFriendship;
  });

  useEffect(() => {
    if (!user || !userProfile || !data?.invitations) return;

    const invitations = data.invitations as any[];
    const acceptedSentInvites = invitations.filter(
      (inv) =>
        inv &&
        inv.status === "accepted" &&
        inv.senderUsername === userProfile.username &&
        !inv.processedBySender
    );

    acceptedSentInvites.forEach(async (invite) => {
      if (!invite) return;
      try {
        const chatId = id();
        if (invite.type === "relationship") {
          await db.transact([
            db.tx.relationships[chatId]
              .update({
                name: invite.receiverUsername || "Partner",
                type: "romantic",
                emoji: "💕",
                partnerUsername: invite.receiverUsername,
                createdAt: Date.now(),
              })
              .link({ owner: user.id }),
            db.tx.invitations[invite.id].update({ processedBySender: true }),
          ]);
        } else if (invite.type === "friendship") {
          await db.transact([
            db.tx.friendships[chatId]
              .update({
                name: invite.receiverUsername || "Friend",
                type: "friend",
                emoji: invite.friendEmoji || "😊",
                photo: invite.friendPhoto || null,
                friendUsername: invite.receiverUsername,
                status: "active",
                createdAt: Date.now(),
              })
              .link({ owner: user.id }),
            db.tx.invitations[invite.id].update({ processedBySender: true }),
          ]);
        }
      } catch (error) {
        console.error("Error processing accepted invitation:", error);
      }
    });
  }, [data?.invitations, user, userProfile]);

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

      const { data: existingData } = await db.queryOnce({
        connections: {
          $: {
            where: {
              or: [
                {
                  and: [
                    { senderUsername: userProfile.username },
                    { receiverUsername: targetProfile.username },
                  ],
                },
                {
                  and: [
                    { senderUsername: targetProfile.username },
                    { receiverUsername: userProfile.username },
                  ],
                },
              ],
            },
          },
        },
      });

      if (existingData?.connections?.length > 0) {
        Alert.alert("Error", "Already connected or pending");
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

      try {
        if (targetProfile.pushToken && targetProfile.notificationsEnabled) {
          await pushNotificationService.sendConnectionRequestNotification(
            targetProfile.pushToken,
            userProfile.username
          );
          console.log("Connection request notification sent to:", targetProfile.username);
        }
      } catch (notifError) {
        console.error("Error sending connection request notification:", notifError);
      }

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
    if (!user) return;

    try {
      if (invite.type === "relationship" && relationships.length > 0) {
        Alert.alert("Error", "You already have a relationship");
        return;
      }

      const chatId = id();
      if (invite.type === "relationship") {
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
              photo: invite.friendPhoto || null,
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

  const handleSelectChat = async (
    type: string,
    chatId: string,
    name: string,
    emoji: string
  ) => {
    if (!user) return;

    try {
      const { data: choiceData } = await db.queryOnce({
        choice: { $: { where: { "owner.id": user.id } } },
      });

      const existingChoice = choiceData?.choice?.[0];

      if (existingChoice) {
        await db.transact(
          db.tx.choice[existingChoice.id].update({
            activeType: type,
            activeId: chatId,
            activeName: name,
            activeEmoji: emoji,
            updatedAt: Date.now(),
          })
        );
      } else {
        const newChoiceId = id();
        await db.transact(
          db.tx.choice[newChoiceId]
            .update({
              activeType: type,
              activeId: chatId,
              activeName: name,
              activeEmoji: emoji,
              updatedAt: Date.now(),
            })
            .link({ owner: user.id })
        );
      }

      router.push("/");
    } catch (error) {
      console.error("Error selecting chat:", error);
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
        }}
        className="shadow-xl"
      >
        <View className="h-24">
          <View className="flex-row items-center h-full px-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/10 rounded-full w-10 h-10 items-center justify-center mr-4 border border-white/20"
            >
              <Text className="text-white text-lg font-bold">‹</Text>
            </TouchableOpacity>
            <Text className="text-3xl text-white font-bold flex-1 text-center">
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
                onPress={() => router.push("/add-chat")}
                className="bg-white/10 rounded-full px-4 py-2 border border-white/20"
              >
                <Text className="text-white text-sm font-bold">Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {pendingConnections.length > 0 && (
          <View className="w-full items-center my-6">
            <Text className="text-2xl font-bold p-2 text-white/90 mb-3">
              Pending Connections
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
              {pendingConnections.map((conn) => (
                <View
                  key={conn.id}
                  style={{ backgroundColor: theme.innerCard }}
                  className="rounded-xl p-4 mb-2 border border-white/20"
                >
                  <View className="flex-row items-center mb-2">
                    <Text className="text-3xl mr-3">🤝</Text>
                    <View>
                      <Text className="text-white font-semibold">
                        {conn.senderUsername} wants to connect
                      </Text>
                      <Text className="text-white/60 text-sm">
                        Connection Request
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAcceptConnection(conn.id)}
                      className="flex-1 bg-green-500/20 py-2 rounded-lg border border-green-500/50"
                    >
                      <Text className="text-green-400 text-center">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        await db.transact(db.tx.connections[conn.id].delete());
                      }}
                      className="flex-1 bg-red-500/20 py-2 rounded-lg border border-red-500/50"
                    >
                      <Text className="text-red-400 text-center">Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {pendingInvitations.length > 0 && (
          <View className="w-full items-center my-6">
            <Text className="text-2xl font-bold p-2 text-white/90 mb-3">
              Pending Invitations
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
              {pendingInvitations.map((invite) => (
                <View
                  key={invite.id}
                  style={{ backgroundColor: theme.innerCard }}
                  className="rounded-xl p-4 mb-2 border border-white/20"
                >
                  <View className="flex-row items-center mb-2">
                    <Text className="text-3xl mr-3">
                      {invite.type === "relationship" ? "💕" : "😊"}
                    </Text>
                    <View>
                      <Text className="text-white font-semibold">
                        {invite.senderUsername} wants to start a {invite.type}
                      </Text>
                      <Text className="text-white/60 text-sm">
                        {invite.type === "relationship"
                          ? "Relationship"
                          : "Friendship"}{" "}
                        Invitation
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAcceptInvitation(invite)}
                      className="flex-1 bg-green-500/20 py-2 rounded-lg border border-green-500/50"
                    >
                      <Text className="text-green-400 text-center">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        await db.transact(
                          db.tx.invitations[invite.id].update({
                            status: "declined",
                            respondedAt: Date.now(),
                          })
                        );
                      }}
                      className="flex-1 bg-red-500/20 py-2 rounded-lg border border-red-500/50"
                    >
                      <Text className="text-red-400 text-center">Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
              {relationships.map((rel) => (
                <TouchableOpacity
                  key={rel.id}
                  style={{ backgroundColor: theme.innerCard }}
                  className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                  onPress={() =>
                    handleSelectChat(
                      "relationship",
                      rel.id,
                      rel.name,
                      rel.emoji || "💕"
                    )
                  }
                >
                  <View className="flex-row items-center">
                    <Text className="text-3xl mr-3">{rel.emoji || "💕"}</Text>
                    <View>
                      <Text className="text-white font-semibold">
                        {rel.name}
                      </Text>
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

        {friendships.length > 0 && (
          <View className="w-full items-center my-6">
            <Text className="text-2xl font-bold p-2 text-white/90 mb-3">
              Friends
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
              {friendships.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={{ backgroundColor: theme.innerCard }}
                  className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                  onPress={() =>
                    handleSelectChat(
                      "friendship",
                      friend.id,
                      friend.name,
                      friend.emoji || "😊"
                    )
                  }
                >
                  <View className="flex-row items-center">
                    {friend.photo ? (
                      <Image
                        source={{ uri: friend.photo }}
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                      />
                    ) : (
                      <Text className="text-3xl mr-3">
                        {friend.emoji || "😊"}
                      </Text>
                    )}
                    <View>
                      <Text className="text-white font-semibold">
                        {friend.name}
                      </Text>
                      <Text className="text-white/60 text-sm">
                        {friend.status || "Active"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-white/80 text-2xl">›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {connections.length > 0 && (
          <View className="w-full items-center my-6">
            <Text className="text-2xl font-bold p-2 text-white/90 mb-3">
              Connections
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
              {connections.map((conn) => {
                const otherUsername =
                  conn.senderUsername === userProfile?.username
                    ? conn.receiverUsername
                    : conn.senderUsername;

                return (
                  <TouchableOpacity
                    key={conn.id}
                    style={{ backgroundColor: theme.innerCard }}
                    className="rounded-xl p-4 mb-2 border border-white/20 flex-row items-center justify-between"
                    onPress={() =>
                      handleSelectChat(
                        "connection",
                        conn.id,
                        otherUsername,
                        "🔗"
                      )
                    }
                  >
                    <View className="flex-row items-center">
                      <Text className="text-3xl mr-3">🔗</Text>
                      <View>
                        <Text className="text-white font-semibold">
                          {otherUsername}
                        </Text>
                        <Text className="text-white/60 text-sm">
                          Connected • Tap to chat
                        </Text>
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
      </ScrollView>

      <Modal
        visible={addConnectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddConnectionModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            style={{ backgroundColor: theme.header }}
            className="rounded-2xl p-6 w-80 border border-white/20"
          >
            <Text className="text-white text-xl font-bold mb-4">
              Add Connection
            </Text>
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
      </Modal>
    </View>
  );
}
