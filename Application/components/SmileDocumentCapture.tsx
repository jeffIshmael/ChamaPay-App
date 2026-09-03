import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Camera, ScanFace } from "lucide-react-native";
import type { KycDocumentType } from "@/lib/kycService";

type Props = {
  params: Record<string, unknown>;
  sandbox: boolean;
  documentType: KycDocumentType;
  busy?: boolean;
  onComplete: (resultRef?: string) => void;
  onError: (message: string) => void;
};

/**
 * Tries to load Smile ID's Expo native view when the package + smile_config
 * are installed. Falls back to a guided sandbox / placeholder capture so the
 * app builds without the native module (Expo 54 may need a matching Smile SDK).
 */
export default function SmileDocumentCapture({
  params,
  sandbox,
  documentType,
  busy,
  onComplete,
  onError,
}: Props) {
  const [phase, setPhase] = useState<"doc" | "face" | "native">("doc");

  const NativeView = useMemo(() => {
    try {
      // Optional dependency — may be absent until Smile Expo SDK is installed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const smile = require("@smile_identity/react-native-expo");
      return smile?.SmileIDDocumentVerificationView ?? null;
    } catch {
      return null;
    }
  }, []);

  if (NativeView) {
    return (
      <View style={styles.nativeWrap}>
        <NativeView
          style={styles.native}
          params={params}
          onResult={(result: unknown) => {
            onComplete(
              typeof result === "string" ? result : JSON.stringify(result)
            );
          }}
          onError={(err: unknown) => {
            const msg =
              err && typeof err === "object" && "message" in err
                ? String((err as any).message)
                : "Smile capture failed";
            onError(msg);
          }}
        />
      </View>
    );
  }

  // Guided fallback (sandbox or pre-SDK)
  return (
    <View className="bg-white rounded-3xl border border-gray-100 p-5">
      <Text className="text-gray-500 text-xs font-semibold uppercase mb-3">
        {sandbox ? "Sandbox capture" : "Capture steps"}
      </Text>

      {!sandbox ? (
        <Text className="text-amber-800 text-sm leading-5 mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
          Smile ID native SDK is not linked in this build yet. Add
          `@smile_identity/react-native-expo` and `smile_config.json`, then
          rebuild the app. Until then, use sandbox mode on the server for
          end-to-end testing.
        </Text>
      ) : null}

      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            phase === "doc" ? "bg-blue-600" : "bg-emerald-500"
          }`}
        >
          <Camera size={18} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold">1. Document scan</Text>
          <Text className="text-gray-500 text-sm">
            {documentType.replace("_", " ").toLowerCase()} ready to capture
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-5">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            phase === "face" ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <ScanFace size={18} color={phase === "face" ? "white" : "#6b7280"} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold">2. Face check</Text>
          <Text className="text-gray-500 text-sm">Live selfie + liveness</Text>
        </View>
      </View>

      {busy ? (
        <ActivityIndicator color="#2563eb" />
      ) : phase === "doc" ? (
        <TouchableOpacity
          onPress={() => setPhase("face")}
          className="bg-blue-600 py-3.5 rounded-2xl items-center"
        >
          <Text className="text-white font-bold">Mark document captured</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() =>
            onComplete(
              sandbox
                ? `sandbox_${documentType}_${String(params.jobId || "")}`
                : undefined
            )
          }
          disabled={!sandbox}
          className={`py-3.5 rounded-2xl items-center ${
            sandbox ? "bg-emerald-600" : "bg-gray-300"
          }`}
        >
          <Text className="text-white font-bold">
            {sandbox ? "Complete sandbox verification" : "Awaiting Smile SDK"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeWrap: {
    height: 480,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  native: {
    flex: 1,
  },
});
