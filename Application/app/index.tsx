import { useAuth } from "@/Contexts/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) router.replace("/(tabs)");
    else router.replace("/onboarding");
  }, [isLoading, isAuthenticated]);

  return null;
}
