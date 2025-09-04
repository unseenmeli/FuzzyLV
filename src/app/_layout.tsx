import "../global.css";
import { Stack } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import * as Notifications from "expo-notifications";
import db from "@/utils/db";
import InAppNotification from "@/components/InAppNotification";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Layout() {
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    data?: any;
  } | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        
        if (title && body) {
          setNotification({
            title,
            body,
            data,
          });
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
    };
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="message" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="add-chat" />
        <Stack.Screen name="notes" />
        <Stack.Screen name="spicy-message" />
        <Stack.Screen name="finger-tap" />
      </Stack>
      {notification && (
        <InAppNotification
          title={notification.title}
          body={notification.body}
          data={notification.data}
          onDismiss={() => setNotification(null)}
        />
      )}
    </>
  );
}
