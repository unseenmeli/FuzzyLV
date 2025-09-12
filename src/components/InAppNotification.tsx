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

  const handlePress = async () => {
    dismissNotification();
    
    if (data?.type === 'message' || data?.chatType) {
      if (data.chatType === 'relationship' || data.chatType === 'friendship') {
        router.push('/message');
      } else if (data.chatType === 'connection') {
        router.push('/chats');
      }
    } else if (data?.screen) {
      router.push(data.screen);
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
    top: 10,
    left: 10,
    right: 10,
    zIndex: 999999,
    elevation: 999999,
    pointerEvents: 'box-none',
  },
  touchable: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
  },
});

export default InAppNotification;