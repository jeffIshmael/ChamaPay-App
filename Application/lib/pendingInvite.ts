import AsyncStorage from "@react-native-async-storage/async-storage";
import { Router } from "expo-router";

const PENDING_CHAMA_KEY = "chamapay_pending_chama";

export async function setPendingChamaInvite(encrypted: string) {
  try {
    await AsyncStorage.setItem(PENDING_CHAMA_KEY, encrypted);
  } catch {
    /* ignore */
  }
}

/** If an invite was stashed before login, open it; else go to fallback. */
export async function redirectAfterAuth(
  router: Router,
  fallback: string = "/(tabs)/index"
) {
  try {
    const pending = await AsyncStorage.getItem(PENDING_CHAMA_KEY);
    if (pending) {
      await AsyncStorage.removeItem(PENDING_CHAMA_KEY);
      router.replace(`/chama/${pending}` as any);
      return;
    }
  } catch {
    /* ignore */
  }
  router.replace(fallback as any);
}
