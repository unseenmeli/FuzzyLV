import { Text, TouchableOpacity, View } from "react-native";
import { GradientBackground, themes } from "@/utils/shared";
import { router } from "expo-router";
import db from "@/utils/db";
import Login from "@/components/Login";

export default function index() {
  const { user, isLoading } = db.useAuth();
  const theme = themes.relationship;
  
  if (isLoading) {
    return (
      <View className="flex-1">
        <GradientBackground colors={themes.relationship.gradient} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <Login />;
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
        }}
        className="w-full h-40 shadow-xl z-10"
      >
        <View className="flex-1 items-end flex-row pb-4">
          <View className="flex-row items-center">
            <View
              className={`w-24 h-24 rounded-full mx-4 overflow-hidden border-4 ${theme.borderAccent}`}
            >
              <View className="w-full h-full bg-white/10 items-center justify-center">
                <Text className="text-5xl">💕</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-4xl text-white font-bold">
                No Selection
              </Text>
              <Text className={`text-sm ${theme.textLight} mt-1`}>
                Select a chat
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-1 px-4">
        <View className="w-full items-center my-6">
          <Text className={`text-2xl font-bold p-2 ${theme.text} mb-3`}>
            Select's mood
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
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text
                  className={`font-semibold text-lg ${theme.textMedium} mb-3`}
                >
                  Expression
                </Text>
                <Text className="text-7xl">😽</Text>
              </View>
              <View className="flex-1 items-center px-3">
                <Text
                  className={`font-semibold text-lg ${theme.textMedium} mb-3`}
                >
                  Note
                </Text>
                <Text className="text-white/80 text-center text-sm leading-5">
                  You are the goat and i love you and blablabla hope you have a
                  good day ml
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="w-full items-center my-6">
          <Text className={`text-2xl font-bold p-2 ${theme.text} mb-3`}>
            Tools
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
            <TouchableOpacity
              style={{
                backgroundColor: theme.innerCard,
                borderColor: theme.innerCardBorder,
              }}
              className="flex-row items-center justify-between mb-4 rounded-xl p-4 border"
              onPress={() => router.push("/tools-chats/fingerTap")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">👆</Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  FingerTap
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
              onPress={() => router.push("/tools-chats/lovenotes")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">💌</Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  Love Notes
                </Text>
              </View>
              <Text className={`${theme.textAccent} text-2xl`}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              className="flex-row items-center justify-between rounded-xl p-4 border border-pink-200/30"
              onPress={() => router.push("/tools-chats/games")}
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">🎮</Text>
                <Text className={`font-semibold text-lg ${theme.textMedium}`}>
                  Games
                </Text>
              </View>
              <Text className={`${theme.textAccent} text-2xl`}>›</Text>
            </TouchableOpacity>
          </View>
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
          <TouchableOpacity className="items-center px-4">
            <Text className={`text-2xl ${theme.textAccent}`}>⌂♡</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
            onPress={() => router.push("/chats")}
          >
            <Text className={`text-2xl ${theme.textAccent}/40`}>▭</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
            onPress={() => router.push("/map")}
          >
            <Text className={`text-2xl ${theme.textAccent}/40`}>○</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
            onPress={() => router.push("/profile")}
          >
            <Text className={`text-2xl ${theme.textAccent}/40`}>◔</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="items-center px-4"
            onPress={() => db.auth.signOut()}
          >
            <Text className={`text-2xl ${theme.textAccent}/40`}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
