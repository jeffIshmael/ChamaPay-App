import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ShieldCheck } from "lucide-react-native";

type Props = {
  sessionToken: string | null;
  /** Didit Console sandbox application */
  sandbox: boolean;
  /** Offline mock with no Didit session */
  localMock?: boolean;
  busy?: boolean;
  onComplete: (result: { status?: string; resultRef?: string }) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
};

/**
 * Launches Didit native verification in-app (no browser redirect).
 * Auto-starts when a session token is present.
 */
export default function DiditVerificationCapture({
  sessionToken,
  sandbox,
  localMock,
  busy,
  onComplete,
  onError,
  onCancel,
}: Props) {
  const [starting, setStarting] = useState(false);
  const launched = useRef(false);

  const launch = useCallback(async () => {
    if (!sessionToken) {
      if (localMock) {
        onComplete({ status: "sandbox", resultRef: "local_mock" });
        return;
      }
      onError(
        "Verification session is missing. Check DIDIT_API_KEY / DIDIT_WORKFLOW_ID."
      );
      return;
    }

    setStarting(true);
    try {
      // Optional until a native rebuild links the module.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const didit = require("@didit-protocol/sdk-react-native");
      const startVerification = didit.startVerification as (
        token: string
      ) => Promise<{
        type: "completed" | "cancelled" | "failed";
        session?: { status?: string };
        error?: { message?: string };
      }>;

      if (typeof startVerification !== "function") {
        throw new Error("Didit SDK startVerification is unavailable");
      }

      const result = await startVerification(sessionToken);

      if (result.type === "cancelled") {
        onCancel?.();
        onError("Verification was cancelled.");
        return;
      }

      if (result.type === "failed") {
        onError(result.error?.message || "Verification failed to start");
        return;
      }

      onComplete({
        status: result.session?.status,
        resultRef: JSON.stringify({
          type: result.type,
          status: result.session?.status,
        }),
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Didit SDK is not linked in this build";
      if (localMock) {
        onComplete({ status: "sandbox", resultRef: `sdk_missing:${msg}` });
        return;
      }
      onError(
        `${msg}. Create a development build with @didit-protocol/sdk-react-native (not Expo Go).`
      );
    } finally {
      setStarting(false);
    }
  }, [sessionToken, localMock, onComplete, onError, onCancel]);

  useEffect(() => {
    if (launched.current || !sessionToken) return;
    launched.current = true;
    void launch();
  }, [sessionToken, launch]);

  const loading = busy || starting;

  return (
    <View className="bg-white rounded-3xl border border-gray-100 p-5">
      <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center mb-3">
        <ShieldCheck size={22} color="#059669" />
      </View>
      <Text className="text-gray-900 font-bold text-lg mb-2">
        Secure in-app check
      </Text>
      <Text className="text-gray-500 text-sm leading-5 mb-5">
        {loading
          ? "Opening the secure camera flow…"
          : "You’ll scan your ID and take a selfie inside ChamaPay. Nothing opens in a browser."}
        {sandbox
          ? " Didit sandbox is on — use sample docs / the in-flow test picker; results are mocked."
          : ""}
      </Text>

      {loading ? (
        <ActivityIndicator color="#2563eb" />
      ) : (
        <TouchableOpacity
          onPress={launch}
          className="bg-blue-600 py-3.5 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold">
            {sessionToken
              ? "Resume verification"
              : localMock
                ? "Complete local mock"
                : "Start verification"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
