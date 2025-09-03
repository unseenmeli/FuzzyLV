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
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";

export default function Chats() {
  const { user } = db.useAuth();
  const [addConnectionModal, setAddConnectionModal] = useState(false);
  const [connectionCode, setConnectionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [manageModal, setManageModal] = useState(false);
  const [selectedManageItem, setSelectedManageItem] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

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

        if (invite.type === "relationship") {
          const existingRel = relationships.find(
            r => r.partnerUsername === invite.receiverUsername
          );
          if (existingRel) {

            await db.transact([
              db.tx.invitations[invite.id].update({ processedBySender: true })
            ]);
            return;
          }
        } else if (invite.type === "friendship") {
          const existingFriend = friendships.find(
            f => f.friendUsername === invite.receiverUsername
          );
          if (existingFriend) {

            await db.transact([
              db.tx.invitations[invite.id].update({ processedBySender: true })
            ]);
            return;
          }
        }

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
  }, [data?.invitations, user, userProfile, relationships, friendships]);

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

            senderPhoto: userProfile.photo || null,
            senderEmoji: userProfile.emoji || "👤",
            receiverPhoto: targetProfile.photo || null,
            receiverEmoji: targetProfile.emoji || "👤",
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

  const handleAcceptConnection = async (connection: any) => {
    if (!userProfile) return;

    try {

      const { data: senderData } = await db.queryOnce({
        profiles: { $: { where: { username: connection.senderUsername } } }
      });
      const senderProfile = senderData?.profiles?.[0];

      await db.transact(
        db.tx.connections[connection.id].update({
          status: "accepted",
          acceptedAt: Date.now(),

          senderPhoto: senderProfile?.photo || connection.senderPhoto || null,
          senderEmoji: senderProfile?.emoji || connection.senderEmoji || "👤",
          receiverPhoto: userProfile?.photo || connection.receiverPhoto || null,
          receiverEmoji: userProfile?.emoji || connection.receiverEmoji || "👤",
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

      if (invite.type === "connection") {

        const existingFriendship = friendships.find(f => f.friendUsername === invite.senderUsername);
        const existingRelationship = relationships.find(r => r.partnerUsername === invite.senderUsername);

        if (existingFriendship) {
          await db.transact(db.tx.friendships[existingFriendship.id].delete());
        } else if (existingRelationship) {
          await db.transact(db.tx.relationships[existingRelationship.id].delete());
        }

        await db.transact(
          db.tx.invitations[invite.id].update({
            status: "accepted",
            respondedAt: Date.now(),
          })
        );
        Alert.alert("Success", "Changed to connection");
        return;
      }

      if (invite.type === "relationship" && relationships.length > 0) {
        Alert.alert("Error", "You already have a relationship");
        return;
      }


      const existingFriendship = friendships.find(f => f.friendUsername === invite.senderUsername);
      const existingRelationship = relationships.find(r => r.partnerUsername === invite.senderUsername);

      if (existingFriendship || existingRelationship) {

        if (existingFriendship && invite.type === "relationship") {
          await db.transact(db.tx.friendships[existingFriendship.id].delete());
        } else if (existingRelationship && invite.type === "friendship") {
          await db.transact(db.tx.relationships[existingRelationship.id].delete());
        } else {
          Alert.alert("Already Connected", `You already have a ${invite.type} with ${invite.senderUsername}`);
          await db.transact(
            db.tx.invitations[invite.id].update({
              status: "accepted",
              respondedAt: Date.now(),
            })
          );
          return;
        }
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

  const handleManageConnection = (item: any, type: string) => {
    setSelectedManageItem({ ...item, currentType: type });
    setManageModal(true);
  };

  const handleChangeType = async (newType: string) => {
    if (!selectedManageItem || !user || !userProfile) return;

    try {
      const otherUsername = selectedManageItem.friendUsername ||
                          selectedManageItem.partnerUsername ||
                          selectedManageItem.name ||
                          (selectedManageItem.senderUsername === userProfile.username
                            ? selectedManageItem.receiverUsername
                            : selectedManageItem.senderUsername);


      if (selectedManageItem.currentType === "friendship") {
        await db.transact(db.tx.friendships[selectedManageItem.id].delete());
      } else if (selectedManageItem.currentType === "relationship") {
        await db.transact(db.tx.relationships[selectedManageItem.id].delete());
      } else if (selectedManageItem.currentType === "connection") {

      }


      const inviteId = id();
      await db.transact(
        db.tx.invitations[inviteId]
          .update({
            type: newType === "connection" ? "connection" : newType,
            status: "pending",
            senderUsername: userProfile.username,
            receiverUsername: otherUsername,
            message: `${userProfile.username} wants to change to ${newType}`,
            createdAt: Date.now(),
          })
          .link({ sender: user.id })
      );

      Alert.alert("Success", `Invitation sent to change to ${newType}`);
      setManageModal(false);
      setSelectedManageItem(null);
    } catch (error) {
      console.error("Error changing type:", error);
      Alert.alert("Error", "Failed to change connection type");
    }
  };

  const handleRemoveConnection = async () => {
    if (!selectedManageItem || !user || !userProfile) return;

    try {
      const otherUsername = selectedManageItem.friendUsername ||
                          selectedManageItem.partnerUsername ||
                          selectedManageItem.name ||
                          (selectedManageItem.senderUsername === userProfile.username
                            ? selectedManageItem.receiverUsername
                            : selectedManageItem.senderUsername);


      if (selectedManageItem.currentType === "friendship") {
        await db.transact(db.tx.friendships[selectedManageItem.id].delete());
      } else if (selectedManageItem.currentType === "relationship") {
        await db.transact(db.tx.relationships[selectedManageItem.id].delete());
      }


      const { data: connectionData } = await db.queryOnce({
        connections: {
          $: {
            where: {
              and: [
                { status: "accepted" },
                {
                  or: [
                    {
                      and: [
                        { senderUsername: userProfile.username },
                        { receiverUsername: otherUsername }
                      ]
                    },
                    {
                      and: [
                        { senderUsername: otherUsername },
                        { receiverUsername: userProfile.username }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      });


      if (connectionData?.connections?.[0]) {
        await db.transact(db.tx.connections[connectionData.connections[0].id].delete());
      }


      const { data: messagesData } = await db.queryOnce({
        messages: {
          $: {
            where: {
              or: [
                {
                  and: [
                    { senderUsername: userProfile.username },
                    { receiverUsername: otherUsername }
                  ]
                },
                {
                  and: [
                    { senderUsername: otherUsername },
                    { receiverUsername: userProfile.username }
                  ]
                }
              ]
            }
          }
        }
      });


      if (messagesData?.messages && messagesData.messages.length > 0) {
        const deletions = messagesData.messages.map(msg =>
          db.tx.messages[msg.id].delete()
        );
        await db.transact(deletions);
      }

      Alert.alert("Success", "Connection and all messages removed");
      setManageModal(false);
      setSelectedManageItem(null);
    } catch (error) {
      console.error("Error removing connection:", error);
      Alert.alert("Error", "Failed to remove connection");
    }
  };

  const cleanupDuplicates = async () => {
    if (!user) return;

    try {

      const { data } = await db.queryOnce({
        friendships: { $: { where: { "owner.id": user.id } } },
        relationships: { $: { where: { "owner.id": user.id } } }
      });

      const allFriendships = data?.friendships || [];
      const allRelationships = data?.relationships || [];


      const friendshipGroups: { [key: string]: any[] } = {};
      const relationshipGroups: { [key: string]: any[] } = {};

      allFriendships.forEach(f => {
        const key = f.friendUsername || 'unknown';
        if (!friendshipGroups[key]) friendshipGroups[key] = [];
        friendshipGroups[key].push(f);
      });

      allRelationships.forEach(r => {
        const key = r.partnerUsername || 'unknown';
        if (!relationshipGroups[key]) relationshipGroups[key] = [];
        relationshipGroups[key].push(r);
      });


      const deletions = [];

      Object.values(friendshipGroups).forEach(group => {
        if (group.length > 1) {

          for (let i = 1; i < group.length; i++) {
            deletions.push(db.tx.friendships[group[i].id].delete());
          }
        }
      });

      Object.values(relationshipGroups).forEach(group => {
        if (group.length > 1) {

          for (let i = 1; i < group.length; i++) {
            deletions.push(db.tx.relationships[group[i].id].delete());
          }
        }
      });

      if (deletions.length > 0) {
        await db.transact(deletions);
        Alert.alert("Cleanup Complete", `Removed ${deletions.length} duplicate entries`);
      } else {
        Alert.alert("No Duplicates", "No duplicate entries found");
      }
    } catch (error) {
      console.error("Error cleaning up duplicates:", error);
      Alert.alert("Error", "Failed to cleanup duplicates");
    }
  };

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

      router.replace("/");
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

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
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
                      onPress={() => handleAcceptConnection(conn)}
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
                  onLongPress={() => handleManageConnection(rel, "relationship")}
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
                  onLongPress={() => handleManageConnection(friend, "friendship")}
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
                    onLongPress={() => handleManageConnection({ ...conn, name: otherUsername }, "connection")}
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
        <BlurView intensity={80} tint="dark" className="flex-1">
          <View className="flex-1 justify-center items-center bg-black/70">
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
        </BlurView>
      </Modal>

      <Modal
        visible={manageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setManageModal(false);
          setSelectedManageItem(null);
        }}
      >
        <BlurView intensity={50} className="flex-1" tint="dark">
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableOpacity
              className="absolute inset-0"
              onPress={() => {
                setManageModal(false);
                setSelectedManageItem(null);
              }}
            />

            <View className="w-11/12 max-w-sm">
              
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: theme.cardBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                className="p-5 mb-4"
              >
                <View className="flex-row items-center">
                  {selectedManageItem?.photo ? (
                    <Image
                      source={{ uri: selectedManageItem.photo }}
                      style={{ width: 50, height: 50, borderRadius: 25, marginRight: 15 }}
                    />
                  ) : (
                    <Text className="text-4xl mr-4">
                      {selectedManageItem?.emoji ||
                       (selectedManageItem?.currentType === "relationship" ? "💕" :
                        selectedManageItem?.currentType === "friendship" ? "😊" : "🔗")}
                    </Text>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">
                      {selectedManageItem?.name ||
                       selectedManageItem?.friendUsername ||
                       selectedManageItem?.partnerUsername ||
                       (selectedManageItem?.senderUsername === userProfile?.username
                         ? selectedManageItem?.receiverUsername
                         : selectedManageItem?.senderUsername)}
                    </Text>
                    <Text className="text-white/80 text-base font-medium">
                      {selectedManageItem?.currentType === "relationship" ? "💕 In a relationship" :
                       selectedManageItem?.currentType === "friendship" ? "😊 Friend" :
                       "🔗 Connected"}
                    </Text>
                  </View>
                </View>
              </View>

              
              <View
                style={{
                  backgroundColor: theme.header,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.headerBorder,
                }}
                className="p-4"
              >
                {selectedManageItem?.currentType !== "relationship" && (
                  <TouchableOpacity
                    onPress={() => handleChangeType("relationship")}
                    className="bg-white/5 p-4 rounded-xl mb-2 border border-pink-500"
                  >
                    <Text className="text-pink-400 text-center font-semibold">
                      💕 Change to Relationship
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedManageItem?.currentType !== "friendship" && (
                  <TouchableOpacity
                    onPress={() => handleChangeType("friendship")}
                    className="bg-white/5 p-4 rounded-xl mb-2 border border-blue-500"
                  >
                    <Text className="text-blue-400 text-center font-semibold">
                      😊 Change to Friendship
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedManageItem?.currentType !== "connection" && (
                  <TouchableOpacity
                    onPress={() => handleChangeType("connection")}
                    className="bg-white/5 p-4 rounded-xl mb-2 border border-gray-500"
                  >
                    <Text className="text-gray-400 text-center font-semibold">
                      🔗 Change to Connection
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Remove Connection",
                      `Are you sure you want to remove ${selectedManageItem?.name || selectedManageItem?.friendUsername || selectedManageItem?.partnerUsername || "this connection"}?\n\nYour messages and shared content will be removed from this device.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: handleRemoveConnection }
                      ]
                    );
                  }}
                  className="bg-white/5 p-4 rounded-xl mb-2 border border-red-500"
                >
                  <Text className="text-red-400 text-center font-semibold">
                    🗑️ Remove Connection
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setManageModal(false);
                    setSelectedManageItem(null);
                  }}
                  className="p-4 rounded-xl bg-white/5 border border-white/20"
                >
                  <Text className="text-white/60 text-center">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </BlurView>
      </Modal>
    </View>
  );
}
