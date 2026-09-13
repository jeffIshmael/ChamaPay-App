import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/Contexts/AuthContext";

type PushData = {
  type?: string;
  chamaId?: number | string;
  chamaSlug?: string;
  tab?: string;
};

function routeFromPushData(
  router: ReturnType<typeof useRouter>,
  data: PushData | undefined
) {
  if (!data) return;

  const slug = data.chamaSlug;
  if (!slug) {
    router.push("/notifications");
    return;
  }

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

/**
 * Listens for notification taps and opens the matching chama / inbox.
 */
export default function PushNotificationRouter() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const handledResponse = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushData;
        routeFromPushData(router, data);
      }
    );

    // Cold start: app opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || handledResponse.current) return;
      handledResponse.current = true;
      const data = response.notification.request.content.data as PushData;
      routeFromPushData(router, data);
    });

    return () => sub.remove();
  }, [isAuthenticated, router]);

  return null;
}
