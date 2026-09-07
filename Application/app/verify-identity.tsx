import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Contact,
  Shield,
  X,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "@/Contexts/AuthContext";
import {
  createKycSession,
  getKycJob,
  getKycStatus,
  reportKycClientResult,
  sandboxApproveKyc,
} from "@/lib/kycService";
import DiditVerificationCapture from "@/components/DiditVerificationCapture";

type Step = "intro" | "capture" | "pending" | "done" | "failed";

/** Brand downy-600 */
const DOWNY_600 = "#1c8584";
const INK = "#0f172a";

const verifyIdentityHero = require("@/assets/images/verify-identity-hero.png");

function DetailRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-center py-4">
      <View className="w-11 h-11 items-center justify-center">{icon}</View>
      <View className="flex-1 ml-3">
        <Text
          className="text-[16px] font-semibold leading-5"
          style={{ color: INK }}
        >
          {title}
        </Text>
        <Text className="text-gray-500 text-[13px] mt-1 leading-5">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [localMock, setLocalMock] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [whyVisible, setWhyVisible] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getKycStatus(token);
    setSandbox(Boolean(res?.sandbox));
    setLocalMock(Boolean(res?.localMock));
    if (res?.kycTier && res.kycTier >= 2 && res.kycStatus === "approved") {
      setStep("done");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (step !== "pending" || !token || !jobId) return;

    let cancelled = false;
    const poll = async () => {
      const job = await getKycJob(token, jobId);
      if (cancelled || !job) return;
      if (job.status === "approved") {
        setStep("done");
        await loadStatus();
      } else if (job.status === "rejected" || job.status === "error") {
        setStep("failed");
        setErrorText(
          "Verification was not approved. Please try again with a clearer scan."
        );
      }
    };

    poll();
    const id = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, token, jobId, loadStatus]);

  const beginVerification = async () => {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to verify your identity.");
      return;
    }
    setBusy(true);
    setErrorText("");
    try {
      const session = await createKycSession(token);
      if (session.alreadyVerified) {
        setStep("done");
        await loadStatus();
        return;
      }
      if (!session.success || !session.jobId) {
        throw new Error(session.error || "Could not start verification");
      }
      setJobId(session.jobId);
      setSessionToken(session.sessionToken || null);
      setSandbox(Boolean(session.sandbox));
      setLocalMock(Boolean(session.localMock) || !session.sessionToken);
      setStep("capture");
    } catch (e: any) {
      setErrorText(e?.message || "Could not start verification");
      Alert.alert("Verification", e?.message || "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

  const onCaptureComplete = async (result: {
    status?: string;
    resultRef?: string;
  }) => {
    if (!token || !jobId) return;
    setBusy(true);
    try {
      await reportKycClientResult(token, jobId, result.resultRef, result.status);
      if (localMock) {
        const approved = await sandboxApproveKyc(token, jobId);
        if (approved?.success) {
          setStep("done");
          await loadStatus();
          return;
        }
      }
      if (result.status === "Declined") {
        setStep("failed");
        setErrorText("Verification was declined. Please try again.");
        return;
      }
      setStep("pending");
    } catch {
      setStep("pending");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      <View
        className="bg-downy-800 rounded-b-3xl px-5 pb-5 flex-row items-center"
        style={{ paddingTop: insets.top + 10 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-10">
          Verify identity
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-24">
            <ActivityIndicator color={DOWNY_600} size="large" />
            <Text className="text-gray-500 text-sm mt-4">
              Preparing verification…
            </Text>
          </View>
        ) : (
          <>
            {errorText && step !== "failed" ? (
              <Text className="text-red-600 text-sm mb-3">{errorText}</Text>
            ) : null}

            {step === "intro" && (
              <View className="flex-1">
                <View className="items-center justify-center pt-1 pb-1">
                  <Image
                    source={verifyIdentityHero}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                    accessibilityLabel="Identity document scan illustration"
                  />
                </View>

                <Text
                  className="text-[26px] font-bold leading-8 text-center"
                  style={{ color: INK }}
                >
                  Identity verification
                </Text>
                <Text className="text-gray-500 text-[15px] mt-2 leading-6 text-center px-1">
                  During this process, you will:
                  {sandbox ? " (Sandbox mode is on for testing.)" : ""}
                </Text>

                <View className="mt-5 bg-white rounded-3xl px-4 border border-downy-100">
                  <DetailRow
                    icon={<Contact size={26} color={INK} strokeWidth={1.8} />}
                    title="Take a picture of your ID"
                    subtitle="Front and back of a valid national ID"
                  />
                  <View className="h-px bg-gray-100 ml-14" />
                  <DetailRow
                    icon={<Camera size={26} color={INK} strokeWidth={1.8} />}
                    title="Take a selfie of yourself"
                    subtitle="So we can match your face to your ID"
                  />
                  <View className="h-px bg-gray-100 ml-14" />
                  <DetailRow
                    icon={<Clock3 size={26} color={INK} strokeWidth={1.8} />}
                    title="Get verified"
                    subtitle="Checks usually take about 1 minute"
                  />
                </View>

                <View className="mt-auto pt-12">
                  <TouchableOpacity
                    onPress={beginVerification}
                    disabled={busy}
                    className="bg-downy-600 py-4 rounded-2xl items-center"
                    activeOpacity={0.85}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold text-[16px]">
                        Start verification
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setWhyVisible(true)}
                    className="items-center mt-8"
                    activeOpacity={0.7}
                  >
                    <Text
                      className="text-[15px] font-medium text-center"
                      style={{
                        color: INK,
                        textDecorationLine: "underline",
                      }}
                    >
                      Why is this needed?
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === "capture" && (
              <View className="pt-4">
                <Text
                  className="text-xl font-bold mb-2"
                  style={{ color: INK }}
                >
                  Scan & selfie
                </Text>
                <Text className="text-gray-500 text-[15px] mb-5 leading-6">
                  Follow the on-screen steps. Keep your face and document fully
                  in frame.
                </Text>
                <DiditVerificationCapture
                  sessionToken={sessionToken}
                  sandbox={sandbox}
                  localMock={localMock}
                  busy={busy}
                  onComplete={onCaptureComplete}
                  onCancel={() => {
                    setErrorText("");
                    setStep("intro");
                  }}
                  onError={(msg) => {
                    setErrorText(msg);
                    setStep("failed");
                  }}
                />
              </View>
            )}

            {step === "pending" && (
              <View className="items-center pt-16 px-4">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-6"
                  style={{ backgroundColor: "rgba(28,133,132,0.1)" }}
                >
                  <ActivityIndicator color={DOWNY_600} size="large" />
                </View>
                <Text
                  className="text-2xl font-bold text-center"
                  style={{ color: INK }}
                >
                  Checking your documents
                </Text>
                <Text className="text-gray-500 text-[15px] text-center mt-3 leading-6">
                  This usually takes a few seconds. You can leave this screen
                  open.
                </Text>
              </View>
            )}

            {step === "done" && (
              <View className="items-center pt-16 px-4">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-6"
                  style={{ backgroundColor: "rgba(28,133,132,0.12)" }}
                >
                  <CheckCircle2 size={40} color={DOWNY_600} strokeWidth={2} />
                </View>
                <Text
                  className="text-2xl font-bold text-center"
                  style={{ color: INK }}
                >
                  You’re verified
                </Text>
                <Text className="text-gray-500 text-[15px] text-center mt-3 leading-6">
                  Your identity check is complete. You’re all set.
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="bg-downy-600 w-full py-4 rounded-2xl items-center mt-10"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-bold text-[16px]">Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "failed" && (
              <View className="pt-12">
                <Text
                  className="text-2xl font-bold mb-3"
                  style={{ color: INK }}
                >
                  Verification didn’t go through
                </Text>
                <Text className="text-gray-500 text-[15px] leading-6 mb-8">
                  {errorText ||
                    "Please retry with better lighting and a clear document photo."}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setErrorText("");
                    setSessionToken(null);
                    setJobId(null);
                    setStep("intro");
                  }}
                  className="bg-downy-600 py-4 rounded-2xl items-center"
                  activeOpacity={0.85}
                >
                  <Text className="text-white font-bold text-[16px]">
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {Platform.OS === "ios" ? <View className="h-4" /> : null}
      </ScrollView>

      <Modal
        visible={whyVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setWhyVisible(false)}
      >
        <View className="flex-1 justify-end">
          <View className="absolute inset-0" pointerEvents="none">
            <BlurView intensity={28} tint="dark" className="absolute inset-0" />
            <View className="absolute inset-0 bg-black/55" />
          </View>
          <Pressable
            className="absolute inset-0"
            onPress={() => setWhyVisible(false)}
          />
          <View
            className="bg-white rounded-t-[28px] px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          >
            <View className="items-center pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4 mt-1">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 rounded-full bg-downy-50 items-center justify-center mr-3">
                  <Shield size={20} color={DOWNY_600} />
                </View>
                <Text
                  className="text-xl font-bold flex-1"
                  style={{ color: INK }}
                >
                  Why is this needed?
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWhyVisible(false)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-700 text-[15px] leading-6 mb-4">
              Identity verification helps us meet anti-money laundering (AML)
              requirements and keep Chamapay safe for everyone.
            </Text>
            <Text className="text-gray-700 text-[15px] leading-6 mb-5">
              On Chamapay, you can freely deposit up to{" "}
              <Text className="font-semibold text-gray-900">KES 20,000</Text>{" "}
              per month without full verification. If you need to go above that
              limit, we’ll ask you to verify your identity first.
            </Text>

            <TouchableOpacity
              onPress={() => setWhyVisible(false)}
              className="bg-downy-600 py-3.5 rounded-2xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-[15px]">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
