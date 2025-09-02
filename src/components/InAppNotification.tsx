import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InAppNotificationProps {
  title: string;
  body: string;
  data?: any;
  onDismiss: () => void;
}

const InAppNotification: React.FC<InAppNotificationProps> = ({
  title,
  body,
  data,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-150)).current;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      dismissNotification();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const dismissNotification = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    dismissNotification();
    
    if (data?.type === 'message') {
      if (data.chatType === 'relationship') {
        router.push({
          pathname: '/message',
          params: {
            chatType: 'relationship',
            partnerName: data.senderName,
          },
        });
      } else if (data.chatType === 'friendship') {
        router.push({
          pathname: '/message',
          params: {
            chatType: 'friendship',
            partnerName: data.senderName,
          },
        });
      } else if (data.chatType === 'connection') {
        router.push('/chats');
      }
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          paddingTop: insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={styles.touchable}
      >
        <View style={styles.notificationContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.body} numberOfLines={1}>
              {body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999999,
    pointerEvents: 'box-none',
  },
  touchable: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default InAppNotification;