// app/index.tsx
import { useAuth } from "@/Contexts/AuthContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { isAuthenticated } = useAuth();

  console.log("[Index] isAuthenticated:", isAuthenticated);

  if (isAuthenticated) {
    console.log("[Index] Redirect → Tabs");
    return <Redirect href="/(tabs)" />;
  }

  console.log("[Index] Redirect → Auth");
  return <Redirect href="/new-auth-screen" />;
}