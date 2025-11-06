import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import cn from "clsx";
import * as Haptics from "expo-haptics";
import { Bell, CreditCard, Plus, Search, Wallet } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const HomeIcon = ({ size = 22, color = "#6b7280" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.006 3.705a.75.75 0 1 0-.512-1.41L6 6.838V3a.75.75 0 0 0-.75-.75h-1.5A.75.75 0 0 0 3 3v4.93l-1.006.365a.75.75 0 0 0 .512 1.41l16.5-6Z"
      fill={color}
    />
    <Path
      fillRule="evenodd"
      d="M3.019 11.114 18 5.667v3.421l4.006 1.457a.75.75 0 1 1-.512 1.41l-.494-.18v8.475h.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1 0-1.5H3v-9.129l.019-.007ZM18 20.25v-9.566l1.5.546v9.02H18Zm-9-6a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75V15a.75.75 0 0 0-.75-.75H9Z"
      clipRule="evenodd"
      fill={color}
    />
  </Svg>
);

const tabs = [
  { name: "index", label: "Home", icon: HomeIcon },
  { name: "discover-chamas", label: "Discover", icon: Search },
  { name: "create-chama", label: "Create", icon: Plus, isCenter: true },
  { name: "notifications", label: "Notifications", icon: Bell, badge: 2 },
  { name: "wallet/index", label: "Wallet", icon: Wallet },
];

export default function BottomNavigation({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name;
  const isRouteInTabs = tabs.some((tab) => tab.name === currentRouteName);

  if (!isRouteInTabs) return null;

  return (
    <View className="absolute bottom-0 left-0  right-0">
      <View 
        className="bg-white rounded-t-3xl shadow-lg bg-[#f1fcfa]"
        style={{
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        }}
      >
        <View className="flex-row justify-around items-center px-4 py-2">
          {tabs.map((tab, idx) => {
            const isActive = state.index === idx;
            const Icon = tab.icon;

            // Floating Action Button
            if (tab.isCenter) {
              return (
                <View key={tab.name} className="flex flex-col items-center justify-center">
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      navigation.navigate(tab.name as never);
                    }}
                    className="rounded-full bg-downy-600 p-3"
                  >
                    <Icon size={24} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                  <Text className={cn(
                    "text-xs mt-1",
                    isActive ? "text-downy-700" : "text-gray-500"
                  )}>Create chama</Text>
                </View>
              );
            }

            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  Haptics.selectionAsync();
                  const event = navigation.emit({
                    type: "tabPress",
                    target: state.routes[idx].key,
                    canPreventDefault: true,
                  });
                  if (!isActive && !event.defaultPrevented) {
                    navigation.navigate(tab.name as never);
                  }
                }}
                className="flex flex-col items-center justify-center"
              >
                <View className="relative flex items-center justify-center">
                  <Icon
                    size={24}
                    color={isActive ? "#1c8584" : "#6b7280"}
                    strokeWidth={2}
                  />
                  {/* Badge */}
                  {tab.badge && tab.badge > 0 && (
                    <View className="absolute -top-1.5 -right-2 bg-red-500 rounded-full w-[18px] h-[18px] flex items-center justify-center">
                      <Text className="text-white text-[10px] font-bold">
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className={cn(
                    "text-xs mt-1",
                    isActive ? "text-downy-600" : "text-gray-500"
                  )}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
