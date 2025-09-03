import {
  Text,
  TouchableOpacity,
  View,
  Switch,
  Modal,
  FlatList,
  Image,
  Alert,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { GradientBackground, themes } from "@/utils/shared";
import { router } from "expo-router";
import db from "@/utils/db";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";

const availableEmojis = [
  "😊",
  "😎",
  "🤓",
  "😇",
  "🤩",
  "😘",
  "🥰",
  "😍",
  "🤗",
  "🤝",
  "👨",
  "👩",
  "🧑",
  "👨‍🦱",
  "👩‍🦱",
  "👨‍🦰",
  "👩‍🦰",
  "👱‍♂️",
  "👱‍♀️",
  "👨‍🦳",
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🦄",
  "🐝",
  "🐢",
  "🐙",
  "🦋",
  "⭐",
  "🌟",
  "✨",
  "💫",
  "🌈",
  "🔥",
  "💧",
  "⚡",
  "🌊",
  "🍀",
];

export default function Profile() {
  const { user } = db.useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPhotoOptions, setShowEditPhotoOptions] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempEmoji, setTempEmoji] = useState<string | null>(null);

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
  const theme = themes.friendship;

  const onRefresh = async () => {
    setRefreshing(true);
    try {


      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setNotificationsEnabled(userProfile.notificationsEnabled ?? true);
      setEditNickname(userProfile.nickname || "");
      setEditUsername(userProfile.username || "");
    }
  }, [userProfile]);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (userProfile) {
      try {
        await db.transact([
          db.tx.profiles[userProfile.id].update({
            notificationsEnabled: value,
          }),
        ]);
        console.log("Notifications", value ? "enabled" : "disabled");
      } catch (error) {
        console.error("Error updating notification settings:", error);
        setNotificationsEnabled(!value);
      }
    }
  };

  const openEditModal = () => {
    setEditNickname(userProfile?.nickname || "");
    setEditUsername(userProfile?.username || "");
    setTempPhoto(userProfile?.photo || null);
    setTempEmoji(userProfile?.emoji || null);
    setShowEditModal(true);
  };

  const pickImageForEdit = async () => {
    try {
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
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setTempPhoto(base64Image);
        setTempEmoji(null);
        console.log("Image selected successfully");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleEmojiSelectForEdit = (emoji: string) => {
    setTempEmoji(emoji);
    setTempPhoto(null);
    setShowEditEmojiPicker(false);
    setShowEditPhotoOptions(false);
    setTimeout(() => setShowEditModal(true), 300);
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    try {

      const isUsernameChanging = editUsername !== userProfile.username;

      if (isUsernameChanging) {

        const lastChange = userProfile.lastUsernameChange || 0;
        const daysSinceChange =
          (Date.now() - lastChange) / (1000 * 60 * 60 * 24);

        if (daysSinceChange < 14) {
          const daysRemaining = Math.ceil(14 - daysSinceChange);
          Alert.alert(
            "Username Change Restricted",
            `You can change your username again in ${daysRemaining} day${
              daysRemaining === 1 ? "" : "s"
            }.`
          );
          return;
        }
      }


      const oldPhoto = userProfile.photo;
      const oldEmoji = userProfile.emoji;


      const { data: connectionsData } = await db.queryOnce({
        connections: {
          $: {
            where: {
              and: [
                { status: "accepted" },
                {
                  or: [
                    { senderUsername: userProfile.username },
                    { receiverUsername: userProfile.username },
                  ],
                },
              ],
            },
          },
        },
      });


      const profileUpdate: any = {
        nickname: editNickname || null,
      };

      if (tempPhoto !== userProfile.photo || tempEmoji !== userProfile.emoji) {
        profileUpdate.photo = tempPhoto;
        profileUpdate.emoji = tempEmoji;
      }

      if (isUsernameChanging) {
        profileUpdate.username = editUsername;
        profileUpdate.lastUsernameChange = Date.now();
      }

      await db.transact([db.tx.profiles[userProfile.id].update(profileUpdate)]);


      const connectionUpdates = [];
      for (const conn of connectionsData?.connections || []) {
        if (conn.senderUsername === userProfile.username) {

          if (
            (conn.senderPhoto === oldPhoto || !conn.senderPhoto) &&
            tempPhoto !== oldPhoto
          ) {
            connectionUpdates.push(
              db.tx.connections[conn.id].update({
                senderPhoto: tempPhoto,
                senderEmoji: tempEmoji,
              })
            );
          }
        } else if (conn.receiverUsername === userProfile.username) {

          if (
            (conn.receiverPhoto === oldPhoto || !conn.receiverPhoto) &&
            tempPhoto !== oldPhoto
          ) {
            connectionUpdates.push(
              db.tx.connections[conn.id].update({
                receiverPhoto: tempPhoto,
                receiverEmoji: tempEmoji,
              })
            );
          }
        }
      }

      if (connectionUpdates.length > 0) {
        await db.transact(connectionUpdates);
      }

      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
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

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
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
            <View className="relative">
              <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center mb-4" style={{ alignItems: 'center', justifyContent: 'center' }}>
                {userProfile?.photo ? (
                  <Image
                    source={{ uri: userProfile.photo }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                  />
                ) : (
                  <Text className="text-5xl" style={{ lineHeight: 96, textAlign: 'center', textAlignVertical: 'center' }}>{userProfile?.emoji || "👤"}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={openEditModal}
                className="absolute bottom-3 right-0 bg-black/40 rounded-full p-2 border border-white/30"
              >
                <Image
                  source={require("../../assets/pencil.png")}
                  style={{ width: 16, height: 16, tintColor: "white" }}
                />
              </TouchableOpacity>
            </View>

            {userProfile?.nickname && (
              <Text className="text-white text-2xl font-semibold mb-1">
                {userProfile.nickname}
              </Text>
            )}
            <Text className="text-white text-xl font-bold mb-2">
              @{userProfile?.username || "Loading..."}
            </Text>

            <Text className="text-white/60 text-sm mb-6">{user?.email}</Text>

            <View className="bg-black/20 rounded-xl px-6 py-3 mb-3">
              <Text className="text-white/80 text-sm mb-1">
                Your Friend Code
              </Text>
              <Text className="text-white text-2xl font-bold tracking-widest">
                {userProfile?.friendCode
                  ? `${userProfile.friendCode.slice(
                      0,
                      3
                    )}-${userProfile.friendCode.slice(3)}`
                  : "---­---"}
              </Text>
            </View>

            {userProfile?.pushToken && (
              <View className="bg-black/10 rounded-xl px-4 py-2">
                <Text className="text-white/60 text-xs mb-1">
                  Push Token (Debug)
                </Text>
                <Text
                  className="text-white/40 text-xs font-mono"
                  numberOfLines={1}
                >
                  {userProfile.pushToken.substring(0, 30)}...
                </Text>
              </View>
            )}
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
            onPress={() => {
              db.auth.signOut();
              router.replace("/");
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
            className="items-center px-4"
            onPress={() => router.replace("/")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>
              ⌂♡
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center px-4"
            onPress={() => router.push("/chats")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>◭</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center px-4">
            <Text className={`text-2xl ${theme.textAccent}`}>◔</Text>
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
              backgroundColor: "#1e3a8a",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">
                Update Profile Picture
              </Text>
              <TouchableOpacity
                onPress={() => setShowPhotoOptions(false)}
                className="bg-white/10 rounded-full p-2"
              >
                <Text className="text-white text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={pickImageForEdit}
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
              <Text className="text-white text-xl font-bold">
                Choose an Emoji
              </Text>
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
                  onPress={() => handleEmojiSelectForEdit(item)}
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
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <BlurView intensity={50} className="flex-1" tint="dark">
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              style={{
                backgroundColor: "#1e3a8a",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.cardBorder,
              }}
              className="w-11/12 max-w-sm p-6"
            >
            <Text className="text-white text-2xl font-bold mb-6 text-center">
              Edit Profile
            </Text>

            
            <TouchableOpacity
              onPress={pickImageForEdit}
              className="items-center mb-6"
            >
              <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center" style={{ alignItems: 'center', justifyContent: 'center' }}>
                {tempPhoto ? (
                  <Image
                    source={{ uri: tempPhoto }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                  />
                ) : tempEmoji ? (
                  <Text className="text-5xl" style={{ lineHeight: 96, textAlign: 'center', textAlignVertical: 'center' }}>{tempEmoji}</Text>
                ) : userProfile?.photo ? (
                  <Image
                    source={{ uri: userProfile.photo }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                  />
                ) : (
                  <Text className="text-5xl" style={{ lineHeight: 96, textAlign: 'center', textAlignVertical: 'center' }}>{userProfile?.emoji || "👤"}</Text>
                )}
              </View>
              <Text className="text-white/60 text-sm mt-2">Tap to change</Text>
            </TouchableOpacity>

            
            <View className="mb-4">
              <Text className="text-white/80 text-sm mb-2">
                Nickname (optional)
              </Text>
              <TextInput
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="Display name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 text-white px-4 py-3 rounded-xl"
              />
            </View>

            
            <View className="mb-6">
              <Text className="text-white/80 text-sm mb-2">Username</Text>
              <TextInput
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 text-white px-4 py-3 rounded-xl"
                autoCapitalize="none"
              />
              {userProfile?.lastUsernameChange && (
                <Text className="text-white/40 text-xs mt-2">
                  {(() => {
                    const daysSince =
                      (Date.now() - userProfile.lastUsernameChange) /
                      (1000 * 60 * 60 * 24);
                    const daysRemaining = Math.ceil(14 - daysSince);
                    return daysRemaining > 0
                      ? `Username can be changed in ${daysRemaining} day${
                          daysRemaining === 1 ? "" : "s"
                        }`
                      : "Username can be changed";
                  })()}
                </Text>
              )}
            </View>

            
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setTempPhoto(null);
                  setTempEmoji(null);
                }}
                className="flex-1 py-3 rounded-xl border border-white/20"
              >
                <Text className="text-white text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                className="flex-1 bg-green-500 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-bold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
      </Modal>

      
      <Modal
        visible={showEditPhotoOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditPhotoOptions(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => {
              setShowEditPhotoOptions(false);
              setTimeout(() => setShowEditModal(true), 300);
            }}
          />
          <View
            style={{
              backgroundColor: "#1e3a8a",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              borderWidth: 1,
              borderColor: theme.headerBorder,
            }}
            className="p-6"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">
                Update Profile Picture
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditPhotoOptions(false);
                  setTimeout(() => setShowEditModal(true), 300);
                }}
                className="bg-white/10 rounded-full p-2"
              >
                <Text className="text-white text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={async () => {
                await pickImageForEdit();
                setTimeout(() => setShowEditModal(true), 300);
              }}
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
                setShowEditPhotoOptions(false);
                setShowEditEmojiPicker(true);
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
        visible={showEditEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditEmojiPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowEditEmojiPicker(false)}
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
              <Text className="text-white text-xl font-bold">
                Choose an Emoji
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditEmojiPicker(false)}
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
                  onPress={() => handleEmojiSelectForEdit(item)}
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
    </View>
  );
}
