import { useAuth } from "@/Contexts/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) router.replace("/(tabs)");
    else router.replace("/new-auth-screen");
  }, [isLoading, isAuthenticated]);

  return null;
}
