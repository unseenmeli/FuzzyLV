import { Text, TouchableOpacity, View } from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import { router } from "expo-router";
import db from "@/utils/db";

export default function Profile() {
  const { user } = db.useAuth();
  
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
        }}
        className="w-full h-40 shadow-xl z-10"
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
            <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center mb-4">
              <Text className="text-5xl">👤</Text>
            </View>
            
            <Text className="text-white text-3xl font-bold mb-2">
              @{userProfile?.username || "Loading..."}
            </Text>
            
            <Text className="text-white/60 text-sm mb-6">
              {user?.email}
            </Text>
            
            <View className="bg-black/20 rounded-xl px-6 py-3">
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
          <TouchableOpacity
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
            <Text className={`${theme.textAccent} text-2xl`}>›</Text>
          </TouchableOpacity>
          
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
            onPress={() => db.auth.signOut()}
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
            onPress={() => router.push("/")}
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
          <TouchableOpacity className="items-center px-4">
            <Text className={`text-2xl opacity-50 ${theme.textAccent}`}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}