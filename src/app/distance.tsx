import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Animated, PanResponder } from "react-native";
import { safeNavigate } from "@/utils/navigation";
import * as Location from 'expo-location';
import db from "@/utils/db";
import { GradientBackground, themes } from "@/utils/shared";
import NavigationWrapper from "@/components/NavigationWrapper";
import Svg, { Circle, Path, G, Ellipse, Line, Defs, RadialGradient, Stop, Pattern, Rect, ClipPath } from "react-native-svg";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function DistanceComponent() {
  const { user } = db.useAuth();
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'waiting'>('loading');
  const [distance, setDistance] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
      },
      onPanResponderMove: (evt, gestureState) => {
        const newRotation = rotationRef.current + gestureState.dx * 0.8;
        setRotation(newRotation);
      },
      onPanResponderRelease: (evt, gestureState) => {
        rotationRef.current = rotationRef.current + gestureState.dx * 0.8;
      },
    })
  ).current;
  
  const { data: profileData } = db.useQuery(
    user
      ? {
          profiles: { $: { where: { "owner.id": user.id } } },
        }
      : {}
  );

  const userProfile = profileData?.profiles?.[0];
  
  const { data: choiceData } = db.useQuery(
    user && userProfile?.username
      ? {
          choice: { $: { where: { "owner.id": user.id } } },
          relationships: { $: { where: { "owner.id": user.id } } },
          friendships: { $: { where: { "owner.id": user.id } } },
        }
      : {}
  );

  const choice = choiceData?.choice?.[0];

  const { data: allData } = db.useQuery(
    choice?.activeType === "relationship" 
      ? { relationships: {} }
      : choice?.activeType === "friendship"
      ? { friendships: {} }
      : {}
  );
  const theme = themes[choice?.activeType] || themes.relationship;

  const getActiveChat = () => {
    if (!choice) return null;
    if (choice.activeType === "relationship") {
      return choiceData?.relationships?.find((r: any) => r?.id === choice.activeId);
    } else if (choice.activeType === "friendship") {
      return choiceData?.friendships?.find((f: any) => f?.id === choice.activeId);
    }
    return null;
  };

  const activeChat = getActiveChat();
  
  const getPartnerChat = () => {
    if (!choice || !userProfile || !activeChat) return null;
    
    if (choice.activeType === "relationship") {
      const partnerUsername = (activeChat as any)?.partnerUsername;
      console.log("Looking for partner relationship:", {
        partnerUsername,
        myUsername: userProfile.username,
        allRelationships: allData?.relationships?.map((r: any) => ({
          id: r.id,
          name: r.name,
          partnerUsername: r.partnerUsername,
          ownerId: r.owner?.id,
          hasLocation: !!r.myLocation
        }))
      });
      let partnerRel = allData?.relationships?.find(
        (r: any) => r.partnerUsername === userProfile.username && r.owner?.id !== user?.id
      );
      
      if (!partnerRel) {
        partnerRel = allData?.relationships?.find(
          (r: any) => r.name === activeChat.name && r.owner?.id !== user?.id
        );
      }
      
      return partnerRel;
    } else if (choice.activeType === "friendship") {
      const friendUsername = (activeChat as any)?.friendUsername;
      console.log("Looking for partner friendship:", {
        friendUsername,
        myUsername: userProfile.username,
        allFriendships: allData?.friendships?.map((f: any) => ({
          id: f.id,
          name: f.name,
          friendUsername: f.friendUsername,
          ownerId: f.owner?.id,
          hasLocation: !!f.myLocation
        }))
      });
      let partnerFriend = allData?.friendships?.find(
        (f: any) => f.friendUsername === userProfile.username && f.owner?.id !== user?.id
      );
      
      if (!partnerFriend) {
        partnerFriend = allData?.friendships?.find(
          (f: any) => f.name === activeChat.name && f.owner?.id !== user?.id
        );
      }
      
      return partnerFriend;
    }
    return null;
  };

  const partnerChat = getPartnerChat();
  const myLocation = (activeChat as any)?.myLocation;
  const partnerLocation = (partnerChat as any)?.myLocation;

  useEffect(() => {
    console.log("Location debug:", {
      myLocation,
      partnerLocation,
      activeChat: activeChat?.id,
      partnerChat: partnerChat?.id,
      myUsername: userProfile?.username,
      partnerUsername: (activeChat as any)?.partnerUsername || (activeChat as any)?.friendUsername,
      allRelationships: allData?.relationships,
      allFriendships: allData?.friendships
    });

    if (myLocation && partnerLocation) {
      console.log("Calculating distance between:", {
        myCoords: { lat: myLocation.latitude, lon: myLocation.longitude },
        partnerCoords: { lat: partnerLocation.latitude, lon: partnerLocation.longitude }
      });
      const dist = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
      console.log("Calculated distance:", dist, "km");
      setDistance(dist);
      setLocationStatus('granted');
    } else if (myLocation && !partnerLocation) {
      setLocationStatus('waiting');
    } else if (!myLocation && partnerLocation) {
      setLocationStatus('loading');
    }
  }, [myLocation, partnerLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to calculate distance');
        setLocationStatus('denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      if (activeChat && choice) {
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now()
        };

        if (choice.activeType === "relationship") {
          await db.transact([
            db.tx.relationships[activeChat.id].update({
              myLocation: locationData
            })
          ]);
        } else if (choice.activeType === "friendship") {
          await db.transact([
            db.tx.friendships[activeChat.id].update({
              myLocation: locationData
            })
          ]);
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your location");
    }
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} meters`;
    } else if (km < 10) {
      return `${km.toFixed(1)} km`;
    } else {
      return `${Math.round(km)} km`;
    }
  };

  const getRotatedPosition = (x: number, y: number, centerX: number, centerY: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = cos * (x - centerX) + sin * (y - centerY) + centerX;
    const ny = cos * (y - centerY) - sin * (x - centerX) + centerY;
    return { x: nx, y: ny };
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
          height: 140,
        }}
        className="w-full shadow-xl z-10"
      >
        <View className="flex-1 flex-row items-end pb-4">
          <TouchableOpacity
            onPress={() => safeNavigate.back()}
            className="ml-4 mb-1"
          >
            <Text className="text-white text-3xl">‹</Text>
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-3xl text-white font-bold mb-2">
              📍 Distance
            </Text>
          </View>
          <View className="w-12" />
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {locationStatus === 'loading' && !myLocation && (
          <View className="items-center">
            <Text className="text-6xl mb-6">📍</Text>
            <Text className={`text-2xl font-bold ${theme.text} mb-4`}>
              Share Your Location
            </Text>
            <Text className={`text-lg ${theme.textMedium} text-center mb-8`}>
              Allow location access to see how far apart you and {choice?.activeName} are
            </Text>
            <TouchableOpacity
              onPress={requestLocationPermission}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              }}
              className="px-8 py-4 rounded-full border"
            >
              <Text className="text-white text-lg font-semibold">
                Share Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {locationStatus === 'waiting' && (
          <View className="items-center">
            <ActivityIndicator size="large" color="#ffffff" className="mb-6" />
            <Text className="text-6xl mb-6">⏳</Text>
            <Text className={`text-2xl font-bold ${theme.text} mb-4`}>
              Waiting for {choice?.activeName}
            </Text>
            <Text className={`text-lg ${theme.textMedium} text-center`}>
              {choice?.activeName} needs to share their location too
            </Text>
          </View>
        )}

        {locationStatus === 'granted' && distance !== null && (
          <View className="items-center">
            {/* Globe visualization */}
            <View className="mb-6" {...panResponder.panHandlers}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                {/* Definitions for gradients and patterns */}
                <Defs>
                  {/* Better ocean gradient with depth */}
                  <RadialGradient id="oceanGradient" cx="50%" cy="40%">
                    <Stop offset="0%" stopColor="#4FC3F7" stopOpacity={1} />
                    <Stop offset="30%" stopColor="#29B6F6" stopOpacity={1} />
                    <Stop offset="60%" stopColor="#039BE5" stopOpacity={1} />
                    <Stop offset="100%" stopColor="#01579B" stopOpacity={1} />
                  </RadialGradient>
                  
                  {/* Shadow gradient for 3D effect */}
                  <RadialGradient id="shadowGradient" cx="30%" cy="30%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
                    <Stop offset="50%" stopColor="#FFFFFF" stopOpacity={0.1} />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
                  </RadialGradient>
                  
                  {/* Clipping mask for globe */}
                  <ClipPath id="globeClip">
                    <Circle cx="100" cy="100" r="78" />
                  </ClipPath>
                </Defs>

                {/* Globe circle with ocean */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="url(#oceanGradient)"
                />
                
                {/* Continent shapes with rotation */}
                <G transform={`rotate(${rotation}, 100, 100)`} clipPath="url(#globeClip)">
                  {/* Simplified, cleaner continents */}
                  
                  {/* Africa */}
                  <Path
                    d="M 100 50 Q 105 48, 108 52 L 107 60 L 106 68 L 105 75 Q 103 82, 100 85 Q 97 82, 95 75 L 94 68 L 93 60 L 94 52 Q 97 48, 100 50 Z"
                    fill="#4CAF50"
                    opacity={0.8}
                  />
                  
                  {/* Europe */}
                  <Path
                    d="M 90 40 Q 95 38, 100 40 L 98 45 L 95 47 L 90 45 Z"
                    fill="#66BB6A"
                    opacity={0.8}
                  />
                  
                  {/* North America */}
                  <Path
                    d="M 45 50 Q 55 48, 65 52 L 68 58 L 65 65 Q 60 70, 55 68 L 50 65 L 45 58 L 43 52 Z"
                    fill="#66BB6A"
                    opacity={0.8}
                  />
                  
                  {/* South America */}
                  <Path
                    d="M 55 85 L 58 90 L 57 100 L 55 110 Q 53 115, 50 113 L 48 105 L 48 95 L 50 87 Z"
                    fill="#4CAF50"
                    opacity={0.8}
                  />
                  
                  {/* Asia */}
                  <Path
                    d="M 115 45 Q 130 43, 145 48 L 150 55 L 148 62 L 145 65 Q 140 68, 135 65 L 125 60 L 118 55 L 115 48 Z"
                    fill="#66BB6A"
                    opacity={0.8}
                  />
                  
                  {/* Australia */}
                  <Path
                    d="M 125 110 Q 130 108, 135 110 L 137 113 Q 135 115, 130 114 L 125 112 Z"
                    fill="#8BC34A"
                    opacity={0.7}
                  />
                  
                  {/* Greenland */}
                  <Path
                    d="M 70 35 Q 72 34, 75 35 L 76 38 Q 74 40, 72 39 L 70 37 Z"
                    fill="#E0E0E0"
                    opacity={0.9}
                  />
                  
                  {/* Repeated continents for seamless rotation */}
                  {/* Africa copy */}
                  <Path
                    d="M 280 50 Q 285 48, 288 52 L 287 60 L 286 68 L 285 75 Q 283 82, 280 85 Q 277 82, 275 75 L 274 68 L 273 60 L 274 52 Q 277 48, 280 50 Z"
                    fill="#4CAF50"
                    opacity={0.8}
                  />
                  
                  {/* Americas copy */}
                  <Path
                    d="M -135 50 Q -125 48, -115 52 L -112 58 L -115 65 Q -120 70, -125 68 L -130 65 L -135 58 L -137 52 Z"
                    fill="#66BB6A"
                    opacity={0.8}
                  />
                  
                  {/* Asia copy on left */}
                  <Path
                    d="M -65 45 Q -50 43, -35 48 L -30 55 L -32 62 L -35 65 Q -40 68, -45 65 L -55 60 L -62 55 L -65 48 Z"
                    fill="#66BB6A"
                    opacity={0.8}
                  />
                </G>

                {/* 3D shadow overlay */}
                <Circle
                  cx="100"
                  cy="100"
                  r="79"
                  fill="url(#shadowGradient)"
                />
                
                {/* Subtle grid lines */}
                <Ellipse
                  cx="100"
                  cy="100"
                  rx="80"
                  ry="40"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />
                <Ellipse
                  cx="100"
                  cy="100"
                  rx="40"
                  ry="80"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                />

                {/* Connection arc between points - make it glow */}
                <Path
                  d="M 50 80 Q 100 40, 150 80"
                  fill="transparent"
                  stroke={choice?.activeType === "relationship" ? "#fbbf24" : "#60a5fa"}
                  strokeWidth="1"
                  opacity={0.3}
                />
                <Path
                  d="M 50 80 Q 100 40, 150 80"
                  fill="transparent"
                  stroke={choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd"}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                
                {/* User location dot with pin effect */}
                <Line
                  x1="50"
                  y1="80"
                  x2="50"
                  y2="95"
                  stroke={choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd"}
                  strokeWidth="2"
                />
                <Circle
                  cx="50"
                  cy="80"
                  r="6"
                  fill={choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd"}
                />
                <Circle
                  cx="50"
                  cy="80"
                  r="10"
                  fill={choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd"}
                  opacity={0.3}
                />
                <Circle
                  cx="50"
                  cy="80"
                  r="14"
                  fill={choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd"}
                  opacity={0.1}
                />
                
                {/* Partner location dot with pin effect */}
                <Line
                  x1="150"
                  y1="80"
                  x2="150"
                  y2="95"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <Circle
                  cx="150"
                  cy="80"
                  r="6"
                  fill="#ffffff"
                />
                <Circle
                  cx="150"
                  cy="80"
                  r="10"
                  fill="#ffffff"
                  opacity={0.3}
                />
                <Circle
                  cx="150"
                  cy="80"
                  r="14"
                  fill="#ffffff"
                  opacity={0.1}
                />
                
                {/* Globe border */}
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </Svg>
            </View>

            <Text className={`text-lg ${theme.textMedium} mb-2`}>
              You and {choice?.activeName} are
            </Text>
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              }}
              className="px-8 py-6 rounded-3xl border mb-4"
            >
              <Text className={`text-4xl font-bold ${theme.text} text-center`}>
                {formatDistance(distance)}
              </Text>
              <Text className={`text-sm ${theme.textLight} text-center mt-1`}>
                apart
              </Text>
            </View>
            
            <View className="flex-row items-center gap-4 mt-4">
              <View className="flex-row items-center">
                <View 
                  style={{ backgroundColor: choice?.activeType === "relationship" ? "#f472b6" : "#93c5fd" }}
                  className="w-3 h-3 rounded-full mr-2" 
                />
                <Text className={`${theme.textMedium} text-sm`}>You</Text>
              </View>
              <View className="flex-row items-center">
                <View 
                  style={{ backgroundColor: "#ffffff" }}
                  className="w-3 h-3 rounded-full mr-2" 
                />
                <Text className={`${theme.textMedium} text-sm`}>{choice?.activeName}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={requestLocationPermission}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              }}
              className="px-6 py-3 rounded-full border mt-6"
            >
              <Text className={`${theme.text} text-base font-medium`}>
                📍 Update Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {locationStatus === 'denied' && (
          <View className="items-center">
            <Text className="text-6xl mb-6">🚫</Text>
            <Text className={`text-2xl font-bold ${theme.text} mb-4`}>
              Location Access Denied
            </Text>
            <Text className={`text-lg ${theme.textMedium} text-center mb-8`}>
              Please enable location access in your device settings to use this feature
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function Distance() {
  return (
    <NavigationWrapper>
      <DistanceComponent />
    </NavigationWrapper>
  );
}