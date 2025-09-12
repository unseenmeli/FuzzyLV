import { Text, TouchableOpacity, View, Switch, Modal, FlatList, Image, Alert, TextInput, ScrollView } from "react-native";
import { router } from "expo-router";
import { GradientBackground, themes } from "@/utils/shared";
import { safeNavigate } from "@/utils/navigation";
import db from "@/utils/db";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";

const availableEmojis = [
  "😊", "😎", "🤓", "😇", "🤩", "😘", "🥰", "😍", "🤗", "🤝",
  "👨", "👩", "🧑", "👨‍🦱", "👩‍🦱", "👨‍🦰", "👩‍🦰", "👱‍♂️", "👱‍♀️", "👨‍🦳",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐝", "🐢", "🐙", "🦋",
  "⭐", "🌟", "✨", "💫", "🌈", "🔥", "💧", "⚡", "🌊", "🍀",
];

export default function Profile() {
  const { user } = db.useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  
  const { data: profileData } = db.useQuery(
    user ? { 
      profiles: { 
        $: { 
          where: { "owner.id": user.id } 
        } 
      }
    } : {}
  );
  
  const userProfile = profileData?.profiles?.[0];
  
  const { data: connectionData } = db.useQuery(
    userProfile?.username ? {
      connections: {
        $: {
          where: {
            or: [
              { senderUsername: userProfile.username },
              { receiverUsername: userProfile.username }
            ]
          }
        }
      }
    } : {}
  );
  
  const connections = connectionData?.connections || [];
  const theme = themes.friendship;
  
  useEffect(() => {
    if (userProfile) {
      setNotificationsEnabled(userProfile.notificationsEnabled ?? true);
    }
  }, [userProfile]);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (userProfile) {
      try {
        await db.transact([
          db.tx.profiles[userProfile.id].update({
            notificationsEnabled: value
          })
        ]);
        console.log("Notifications", value ? "enabled" : "disabled");
      } catch (error) {
        console.error("Error updating notification settings:", error);
        setNotificationsEnabled(!value);
      }
    }
  };

  const pickImage = async () => {
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

    if (!result.canceled && result.assets[0] && userProfile) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        await db.transact([
          db.tx.profiles[userProfile.id].update({
            photo: base64Image,
            emoji: null
          })
        ]);
        
        for (const connection of connections) {
          if (connection.senderUsername === userProfile.username) {
            await db.transact([
              db.tx.connections[connection.id].update({
                senderPhoto: base64Image,
                senderEmoji: null
              })
            ]);
          } else if (connection.receiverUsername === userProfile.username) {
            await db.transact([
              db.tx.connections[connection.id].update({
                receiverPhoto: base64Image,
                receiverEmoji: null
              })
            ]);
          }
        }
        
        setShowPhotoOptions(false);
      } catch (error) {
        console.error("Error updating profile photo:", error);
        Alert.alert("Error", "Failed to update profile photo");
      }
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (userProfile) {
      try {
        await db.transact([
          db.tx.profiles[userProfile.id].update({
            emoji: emoji,
            photo: null
          })
        ]);
        
        for (const connection of connections) {
          if (connection.senderUsername === userProfile.username) {
            await db.transact([
              db.tx.connections[connection.id].update({
                senderEmoji: emoji,
                senderPhoto: null
              })
            ]);
          } else if (connection.receiverUsername === userProfile.username) {
            await db.transact([
              db.tx.connections[connection.id].update({
                receiverEmoji: emoji,
                receiverPhoto: null
              })
            ]);
          }
        }
        
        setShowEmojiPicker(false);
        setShowPhotoOptions(false);
      } catch (error) {
        console.error("Error updating profile emoji:", error);
        Alert.alert("Error", "Failed to update profile emoji");
      }
    }
  };

  const handleUsernameUpdate = async () => {
    if (!userProfile || !newUsername.trim()) {
      Alert.alert("Error", "Please enter a valid username");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      Alert.alert("Error", "Username must be between 3 and 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      Alert.alert("Error", "Username can only contain letters, numbers, and underscores");
      return;
    }

    try {
      const existingProfiles = await db.queryOnce({
        profiles: {
          $: {
            where: { username: newUsername }
          }
        }
      });

      if (existingProfiles.data?.profiles?.length > 0 && existingProfiles.data.profiles[0].id !== userProfile.id) {
        Alert.alert("Error", "Username already taken");
        return;
      }

      const oldUsername = userProfile.username;

      await db.transact([
        db.tx.profiles[userProfile.id].update({
          username: newUsername
        })
      ]);

      for (const connection of connections) {
        if (connection.senderUsername === oldUsername) {
          await db.transact([
            db.tx.connections[connection.id].update({
              senderUsername: newUsername
            })
          ]);
        } else if (connection.receiverUsername === oldUsername) {
          await db.transact([
            db.tx.connections[connection.id].update({
              receiverUsername: newUsername
            })
          ]);
        }
      }

      const allRelationships = await db.queryOnce({ relationships: {} });
      const userRelationships = allRelationships.data?.relationships?.filter((r: any) => 
        r.partnerUsername === oldUsername
      ) || [];
      
      for (const rel of userRelationships) {
        await db.transact([
          db.tx.relationships[rel.id].update({
            partnerUsername: newUsername
          })
        ]);
      }

      const allFriendships = await db.queryOnce({ friendships: {} });
      const userFriendships = allFriendships.data?.friendships?.filter((f: any) => 
        f.friendUsername === oldUsername
      ) || [];
      
      for (const friend of userFriendships) {
        await db.transact([
          db.tx.friendships[friend.id].update({
            friendUsername: newUsername
          })
        ]);
      }

      setShowUsernameModal(false);
      setNewUsername("");
      Alert.alert("Success", "Username updated successfully");
    } catch (error) {
      console.error("Error updating username:", error);
      Alert.alert("Error", "Failed to update username");
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
          paddingTop: 40,
          height: 170,
        }}
        className="w-full shadow-xl z-10"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-3xl font-bold">Profile</Text>
        </View>
      </View>
      
      <ScrollView className="flex-1 px-4 pt-8" showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          className="w-full p-6 shadow-xl mb-6"
        >
          <View className="items-center">
            <View className="relative mb-4">
              <TouchableOpacity 
                onPress={() => setShowPhotoOptions(true)}
                className="w-24 h-24 rounded-full bg-white/10 items-center justify-center"
              >
                {userProfile?.photo ? (
                  <Image
                    source={{ uri: userProfile.photo }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                  />
                ) : (
                  <Text className="text-5xl">{userProfile?.emoji || "👤"}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowPhotoOptions(true)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 border-2 border-white items-center justify-center"
                style={{ backgroundColor: "#1e293b" }}
              >
                <Text className="text-white text-sm">✎</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              onPress={() => {
                setNewUsername(userProfile?.username || "");
                setShowUsernameModal(true);
              }}
              className="mb-2"
            >
              <Text className="text-white text-3xl font-bold">
                @{userProfile?.username || "Loading..."}
              </Text>
            </TouchableOpacity>
            
            <Text className="text-white/60 text-sm mb-6">
              {user?.email}
            </Text>
            
            <View className="bg-black/20 rounded-xl px-6 py-3 mb-3">
              <Text className="text-white/80 text-sm mb-1">Your Friend Code</Text>
              <Text className="text-white text-2xl font-bold tracking-widest">
                {userProfile?.friendCode ? `${userProfile.friendCode.slice(0, 3)}-${userProfile.friendCode.slice(3)}` : "---­---"}
              </Text>
            </View>
          </View>
        </View>
        
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.cardBorder,
          }}
          className="w-full p-5 shadow-xl"
        >
          <View
            style={{
              backgroundColor: theme.innerCard,
              borderColor: theme.innerCardBorder,
            }}
            className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4 text-white">◐</Text>
              <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#767577", true: theme.innerCardBorder }}
              thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>
          
          <TouchableOpacity
            style={{
              backgroundColor: theme.innerCard,
              borderColor: theme.innerCardBorder,
            }}
            className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4 text-white">⬢</Text>
              <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                Settings
              </Text>
            </View>
            <Text className={`${theme.textAccent} text-2xl`}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              borderColor: "rgba(239,68,68,0.3)",
            }}
            className="flex-row items-center justify-between rounded-xl p-4 border"
            onPress={async () => {
              await db.auth.signOut();
              safeNavigate.replace("/");
            }}
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4 text-red-400">⬡</Text>
              <Text className="font-semibold text-lg text-red-400">
                Sign Out
              </Text>
            </View>
            <Text className="text-red-400 text-2xl">›</Text>
          </TouchableOpacity>
        </View>
        
        {/* Add padding at bottom for footer */}
        <View className="h-20" />
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
          <TouchableOpacity 
            className="items-center px-6"
            onPress={() => router.replace("/")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>⌂</Text>
            <Text className={`text-xs mt-1 opacity-50 ${theme.textAccent}`}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-6"
          >
            <Text className={`text-2xl ${theme.textAccent}`}>◔</Text>
            <Text className={`text-xs mt-1 ${theme.textAccent}`}>Profile</Text>
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
              backgroundColor: "#1e293b",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">Update Profile Picture</Text>
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
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
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
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
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
              backgroundColor: "#1e3a8a",
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

      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity 
            className="flex-1" 
            activeOpacity={1}
            onPress={() => setShowUsernameModal(false)}
          />
          <View
            style={{
              backgroundColor: "#1e293b",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">Change Username</Text>
              <TouchableOpacity
                onPress={() => setShowUsernameModal(false)}
                className="bg-white/10 rounded-full p-2"
              >
                <Text className="text-white text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor="rgba(255,255,255,0.5)"
              className="bg-white/10 rounded-xl px-4 py-3 text-white text-lg mb-2"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            <Text className="text-white/60 text-xs mb-4 px-2">
              3-20 characters, letters, numbers, and underscores only
            </Text>
            
            <TouchableOpacity
              onPress={handleUsernameUpdate}
              style={{
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
              }}
              className="py-4 rounded-xl border"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Update Username
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}