import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/Contexts/AuthContext";

type PushData = {
  type?: string;
  chamaId?: number | string;
  chamaSlug?: string;
  tab?: string;
};

/** Only deep-link into a chama when the push carries a slug. Never auto-open the inbox. */
function routeFromPushData(data: PushData | undefined) {
  if (!data?.chamaSlug) return;

  const slug = data.chamaSlug;
  const tab = data.tab;
  if (tab === "chat") {
    router.push({
      pathname: "/(tabs)/joined-chama-details/[id]",
      params: { id: slug, tab: "chat" },
    });
    return;
  }
  if (tab === "schedule") {
    router.push({
      pathname: "/(tabs)/joined-chama-details/[id]",
      params: { id: slug, tab: "schedule" },
    });
    return;
  }

  router.push({
    pathname: "/(tabs)/joined-chama-details/[id]",
    params: { id: slug },
  });
}

function responseAgeMs(response: Notifications.NotificationResponse): number {
  const raw = response.notification.date;
  const ts = typeof raw === "number" ? raw : new Date(raw).getTime();
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return Date.now() - ms;
}

/**
 * Listens for notification taps.
 * Uses the imperative `router` API (no useRouter / useNavigation) so it can
 * safely sit in the root layout without NavigationContainer timing issues.
 */
export default function PushNotificationRouter() {
  const { isAuthenticated } = useAuth();
  const handledResponse = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushData;
        routeFromPushData(data);
        void Notifications.clearLastNotificationResponseAsync();
      }
    );

    void Notifications.getLastNotificationResponseAsync().then(
      async (response) => {
        if (!response || handledResponse.current) {
          await Notifications.clearLastNotificationResponseAsync();
          return;
        }
        handledResponse.current = true;
        const data = response.notification.request.content.data as PushData;
        const fresh = responseAgeMs(response) < 20_000;
        if (fresh && data?.chamaSlug) {
          routeFromPushData(data);
        }
        await Notifications.clearLastNotificationResponseAsync();
      }
    );

    return () => sub.remove();
  }, [isAuthenticated]);

  return null;
}
