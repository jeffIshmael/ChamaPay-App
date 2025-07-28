import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to onboarding by default
  return <Redirect href="/(tabs)" />;
}
