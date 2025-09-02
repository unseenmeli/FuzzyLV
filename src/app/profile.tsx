import { Text, TouchableOpacity, View, Switch, Modal, FlatList, Image, Alert } from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import { router } from "expo-router";
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
        setShowEmojiPicker(false);
        setShowPhotoOptions(false);
      } catch (error) {
        console.error("Error updating profile emoji:", error);
        Alert.alert("Error", "Failed to update profile emoji");
      }
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
      
      <View className="flex-1 px-4 pt-8">
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
            <TouchableOpacity 
              onPress={() => setShowPhotoOptions(true)}
              className="w-24 h-24 rounded-full bg-white/10 items-center justify-center mb-4"
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
            <Text className="text-white/60 text-xs mb-2">Tap to change</Text>
            
            <Text className="text-white text-3xl font-bold mb-2">
              @{userProfile?.username || "Loading..."}
            </Text>
            
            <Text className="text-white/60 text-sm mb-6">
              {user?.email}
            </Text>
            
            <View className="bg-black/20 rounded-xl px-6 py-3 mb-3">
              <Text className="text-white/80 text-sm mb-1">Your Friend Code</Text>
              <Text className="text-white text-2xl font-bold tracking-widest">
                {userProfile?.friendCode ? `${userProfile.friendCode.slice(0, 3)}-${userProfile.friendCode.slice(3)}` : "---­---"}
              </Text>
            </View>
            
            {userProfile?.pushToken && (
              <View className="bg-black/10 rounded-xl px-4 py-2">
                <Text className="text-white/60 text-xs mb-1">Push Token (Debug)</Text>
                <Text className="text-white/40 text-xs font-mono" numberOfLines={1}>
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
      </View>
      
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
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>⌂♡</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
            onPress={() => router.push("/chats")}
          >
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>◭</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
          >
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
    </View>
  );
}