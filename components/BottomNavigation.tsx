import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import cn from "clsx";
import { CreditCard, Home, Plus, Search } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "index", label: "Home", icon: Home },
  { name: "discover-chamas", label: "Discover", icon: Search },
  { name: "create-chama", label: "Create", icon: Plus },
  { name: "transactions-history", label: "Wallet", icon: CreditCard },
];

export default function BottomNavigation({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
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
