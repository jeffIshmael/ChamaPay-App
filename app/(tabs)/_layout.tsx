import BottomNavigation from "@/components/BottomNavigation";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNavigation {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="discover-chamas" options={{ title: "Discover" }} />
      <Tabs.Screen name="create-chama" options={{ title: "Create" }} />
      <Tabs.Screen name="wallet/index" options={{ title: "Wallet" }} />
    </Tabs>
  );
}
