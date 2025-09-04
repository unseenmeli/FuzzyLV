import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { GradientBackground, themes } from "@/utils/shared";
import db from "@/utils/db";
import { id } from "@instantdb/react-native";
import pushNotificationService from "@/services/pushNotificationService";

export default function AddChat() {
  const { user } = db.useAuth();
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [chatType, setChatType] = useState<"relationship" | "friendship" | "group">("friendship");
  const [loading, setLoading] = useState(false);
  
  const { data: profileData } = db.useQuery(
    user ? {
      profiles: { $: { where: { "owner.id": user.id } } }
    } : {}
  );
  const myProfile = profileData?.profiles?.[0];
  
  const { data: existingData } = db.useQuery(
    user ? {
      relationships: { $: { where: { "owner.id": user.id } } },
      friendships: { $: { where: { "owner.id": user.id } } }
    } : {}
  );
  const hasRelationship = (existingData?.relationships || []).length > 0;
  const relationships = existingData?.relationships || [];
  const friendships = existingData?.friendships || [];
  
  const { data: connectionData } = db.useQuery(
    myProfile ? {
      connections: {
        $: {
          where: {
            or: [
              { and: [{ senderUsername: myProfile.username }, { status: "accepted" }] },
              { and: [{ receiverUsername: myProfile.username }, { status: "accepted" }] },
            ],
          },
        },
      },
    } : {}
  );
  
  const allConnections = connectionData?.connections || [];
  const connections = allConnections.filter(conn => {
    const otherUsername = conn.senderUsername === myProfile?.username 
      ? conn.receiverUsername 
      : conn.senderUsername;
    
    const hasExistingRelationship = relationships.some(rel => rel.partnerUsername === otherUsername);
    const hasExistingFriendship = friendships.some(friend => friend.friendUsername === otherUsername);
    
    return !hasExistingRelationship && !hasExistingFriendship;
  });
  
  const theme = themes[chatType];
  
  const handleInvite = async () => {
    if (!selectedConnection || !user || !myProfile) {
      Alert.alert("Error", "Please select a connection");
      return;
    }
    
    const targetUsername = selectedConnection.senderUsername === myProfile.username 
      ? selectedConnection.receiverUsername 
      : selectedConnection.senderUsername;
    
    if (chatType === "relationship") {
      if (hasRelationship) {
        Alert.alert("Already in Relationship", "You already are in a relationship.");
        return;
      }
    }
    
    const existingInvites = await db.queryOnce({
      invitations: {
        $: {
          where: {
            and: [
              { senderUsername: myProfile.username },
              { receiverUsername: targetUsername },
              { type: chatType },
              { status: "pending" }
            ]
          }
        }
      }
    });
    
    if (existingInvites.data?.invitations?.length > 0) {
      Alert.alert("Already Sent", `You already sent a ${chatType} invitation to ${targetUsername}`);
      return;
    }
    
    setLoading(true);
    try {
      const inviteId = id();
      
      const invitationData: any = {
        type: chatType,
        status: "pending",
        senderUsername: myProfile.username,
        receiverUsername: targetUsername,
        message: `${myProfile.username} invites you to start a ${chatType}`,
        createdAt: Date.now(),
      };

      if (myProfile.photo) {
        invitationData.friendPhoto = myProfile.photo;
      } else if (myProfile.emoji) {
        invitationData.friendEmoji = myProfile.emoji;
      }

      await db.transact(
        db.tx.invitations[inviteId]
          .update(invitationData)
          .link({ 
            sender: user.id,
          })
      );
      
      try {
        const recipientResult = await db.queryOnce({
          profiles: {
            $: {
              where: { username: targetUsername }
            }
          }
        });
        
        const recipientProfile = recipientResult.data?.profiles?.[0];
        
        if (recipientProfile?.pushToken && recipientProfile?.notificationsEnabled) {
          if (chatType === "relationship" || chatType === "friendship") {
            await pushNotificationService.sendInvitationNotification(
              recipientProfile.pushToken,
              myProfile.username,
              chatType as 'relationship' | 'friendship'
            );
            console.log("Invitation notification sent to:", targetUsername);
          }
        }
      } catch (notifError) {
        console.error("Error sending invitation notification:", notifError);
      }
      
      Alert.alert(
        "Invitation Sent!", 
        `Invitation sent to ${targetUsername}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (connections.length === 0) {
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
                className="bg-white/10 rounded-full p-3 mr-4 border border-white/20"
              >
                <Text className="text-white text-lg font-bold">‹</Text>
              </TouchableOpacity>
              <Text className="text-3xl text-white font-bold flex-1 text-center">
                Add Chat
              </Text>
              <View className="w-14" />
            </View>
          </View>
        </View>
        
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-white text-xl text-center mb-4">No Connections Yet</Text>
          <Text className="text-white/60 text-center mb-6">
            Connect with people using their friend code first, then you can invite them to chat!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/chats")}
            style={{
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            }}
            className="py-3 px-6 rounded-xl border"
          >
            <Text className="text-white font-semibold">Back to Chats</Text>
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
        <View className="h-24">
          <View className="flex-row items-center h-full px-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/10 rounded-full p-3 mr-4 border border-white/20"
            >
              <Text className="text-white text-lg font-bold">‹</Text>
            </TouchableOpacity>
            <Text className="text-3xl text-white font-bold flex-1 text-center">
              Invite to Chat
            </Text>
            <View className="w-14" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="py-6">
          <Text className={`text-lg font-bold ${theme.text} mb-3`}>
            Select Chat Type
          </Text>
          <View className="flex-row justify-between mb-6">
            <TouchableOpacity
              onPress={() => {
                if (!hasRelationship) {
                  setChatType("relationship");
                } else {
                  Alert.alert("Relationship Exists", "You already have a relationship");
                }
              }}
              style={{
                backgroundColor:
                  chatType === "relationship" ? theme.card : "rgba(255,255,255,0.05)",
                borderColor:
                  chatType === "relationship" ? theme.cardBorder : "rgba(255,255,255,0.1)",
                opacity: hasRelationship ? 0.5 : 1,
              }}
              className="flex-1 mx-1 py-3 rounded-xl border"
              disabled={hasRelationship}
            >
              <Text className="text-white text-center">Relationship</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setChatType("friendship")}
              style={{
                backgroundColor:
                  chatType === "friendship" ? theme.card : "rgba(255,255,255,0.05)",
                borderColor:
                  chatType === "friendship" ? theme.cardBorder : "rgba(255,255,255,0.1)",
              }}
              className="flex-1 mx-1 py-3 rounded-xl border"
            >
              <Text className="text-white text-center">Friendship</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setChatType("group")}
              style={{
                backgroundColor:
                  chatType === "group" ? theme.card : "rgba(255,255,255,0.05)",
                borderColor:
                  chatType === "group" ? theme.cardBorder : "rgba(255,255,255,0.1)",
              }}
              className="flex-1 mx-1 py-3 rounded-xl border"
            >
              <Text className="text-white text-center">Group</Text>
            </TouchableOpacity>
          </View>

          <Text className={`text-lg font-bold ${theme.text} mb-3`}>
            Select Connection
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
            className="p-2"
          >
            {connections.length === 0 ? (
              <View className="p-4">
                <Text className="text-white/60 text-center">
                  No available connections. All your connections already have formal relationships.
                </Text>
              </View>
            ) : (
              connections.map((conn) => {
              const displayName = conn.senderUsername === myProfile?.username 
                ? conn.receiverUsername 
                : conn.senderUsername;
              const isSelected = selectedConnection?.id === conn.id;
              
              return (
                <TouchableOpacity
                  key={conn.id}
                  onPress={() => setSelectedConnection(conn)}
                  style={{
                    backgroundColor: isSelected ? theme.innerCard : "transparent",
                    borderColor: isSelected ? theme.innerCardBorder : "transparent",
                  }}
                  className="flex-row items-center justify-between p-3 rounded-xl border mb-2"
                >
                  <View className="flex-row items-center">
                    <Text className="text-3xl mr-3">
                      {isSelected ? "✓" : "○"}
                    </Text>
                    <View>
                      <Text className="text-white font-semibold text-lg">
                        {displayName}
                      </Text>
                      <Text className={`text-sm ${theme.textLight}`}>
                        Connected
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </View>

          <TouchableOpacity
            onPress={handleInvite}
            disabled={!selectedConnection || loading}
            style={{
              backgroundColor: selectedConnection
                ? theme.card
                : "rgba(255,255,255,0.05)",
              borderColor: selectedConnection
                ? theme.cardBorder
                : "rgba(255,255,255,0.1)",
              marginTop: 24,
            }}
            className="py-4 rounded-xl border"
          >
            <Text className="text-white text-center font-bold text-lg">
              {loading ? "Sending Invitation..." : "Send Invitation"}
            </Text>
          </TouchableOpacity>

          <Text className={`text-center ${theme.textLight} text-sm mt-4`}>
            They'll need to accept your invitation before the chat is created
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}