import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import cn from "clsx";
import { CreditCard, Plus, Search } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const HomeIcon = ({ size = 20, color = "#6b7280" }: { size?: number; color?: string }) => (
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
  { name: "create-chama", label: "Create", icon: Plus },
  { name: "wallet/index", label: "Wallet", icon: CreditCard },
];

export default function BottomNavigation({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Check if current route is defined in tabs
  const currentRouteName = state.routes[state.index]?.name;
  const isRouteInTabs = tabs.some(tab => tab.name === currentRouteName);
  
  // Hide navigation if current route is not in tabs
  if (!isRouteInTabs) {
    return null;
  }

  return (
    <View
      className="bg-white border-t border-gray-200 pb-4"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="flex-row justify-around items-center px-4">
        {tabs.map((tab, idx) => {
          const isActive = state.index === idx;
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: state.routes[idx].key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(tab.name as never);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px]",
                isActive ? "text-emerald-600" : "text-gray-500"
              )}
            >
              <Icon size={20} color={isActive ? "#059669" : "#6b7280"} />
              <Text
                className={cn(
                  "text-xs",
                  isActive ? "text-emerald-600 font-medium" : "text-gray-500"
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
