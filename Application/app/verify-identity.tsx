import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  FileText,
  Shield,
} from "lucide-react-native";
import { useAuth } from "@/Contexts/AuthContext";
import {
  createKycSession,
  getKycJob,
  getKycStatus,
  KYC_DOC_OPTIONS,
  reportKycClientResult,
  sandboxApproveKyc,
  type KycDocumentType,
  type KycStatusResponse,
} from "@/lib/kycService";
import SmileDocumentCapture from "@/components/SmileDocumentCapture";

type Step = "intro" | "pick" | "capture" | "pending" | "done" | "failed";

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<KycDocumentType | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [smileParams, setSmileParams] = useState<Record<string, unknown> | null>(
    null
  );
  const [sandbox, setSandbox] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getKycStatus(token);
    setStatus(res);
    setSandbox(Boolean(res?.sandbox));
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
        setErrorText("Verification was not approved. Please try again with a clearer scan.");
      }
    };

    poll();
    const id = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, token, jobId, loadStatus]);

  const startSession = async (type: KycDocumentType) => {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to verify your identity.");
      return;
    }
    setBusy(true);
    setErrorText("");
    setDocType(type);
    try {
      const session = await createKycSession(token, type);
      if (session.alreadyVerified) {
        setStep("done");
        await loadStatus();
        return;
      }
      if (!session.success || !session.jobId) {
        throw new Error(session.error || "Could not start verification");
      }
      setJobId(session.jobId);
      setSmileParams(session.smileParams || null);
      setSandbox(Boolean(session.sandbox));
      setStep("capture");
    } catch (e: any) {
      setErrorText(e?.message || "Could not start verification");
      Alert.alert("Verification", e?.message || "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

  const onCaptureComplete = async (resultRef?: string) => {
    if (!token || !jobId) return;
    setBusy(true);
    try {
      await reportKycClientResult(token, jobId, resultRef);
      if (sandbox) {
        const approved = await sandboxApproveKyc(token, jobId);
        if (approved?.success) {
          setStep("done");
          await loadStatus();
          return;
        }
      }
      setStep("pending");
    } catch {
      setStep("pending");
    } finally {
      setBusy(false);
    }
  };

  const remainingLabel = useMemo(() => {
    if (!status) return null;
    return `KES ${Math.floor(status.remainingKes).toLocaleString()} left this month (limit KES ${status.limitKes.toLocaleString()})`;
  }, [status]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

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
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {remainingLabel ? (
          <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-xs font-semibold uppercase mb-1">
              Deposit headroom
            </Text>
            <Text className="text-gray-900 font-bold text-[15px]">{remainingLabel}</Text>
            {status && status.kycTier < 2 ? (
              <Text className="text-gray-500 text-sm mt-2 leading-5">
                Verify once to raise your monthly M-Pesa deposit limit to KES{" "}
                {status.tier2LimitKes.toLocaleString()}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {errorText ? (
          <Text className="text-red-600 text-sm mb-3">{errorText}</Text>
        ) : null}

        {step === "intro" && (
          <View>
            <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
              <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center mb-3">
                <Shield size={22} color="#059669" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Increase your deposit limit
              </Text>
              <Text className="text-gray-600 text-[15px] leading-6 mb-4">
                Chamapay lets you deposit up to KES{" "}
                {status?.tier1LimitKes?.toLocaleString() ?? "20,000"} per month
                without extra checks. To go higher, we need a quick ID and face
                check powered by Smile ID.
              </Text>
              <View className="gap-3">
                <View className="flex-row items-start">
                  <FileText size={18} color="#2563eb" />
                  <Text className="text-gray-700 text-sm ml-2 flex-1 leading-5">
                    Scan your National ID, passport, or driver’s license
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Camera size={18} color="#2563eb" />
                  <Text className="text-gray-700 text-sm ml-2 flex-1 leading-5">
                    Take a live selfie so we know it’s you
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <BadgeCheck size={18} color="#2563eb" />
                  <Text className="text-gray-700 text-sm ml-2 flex-1 leading-5">
                    After approval, your monthly limit becomes KES{" "}
                    {status?.tier2LimitKes?.toLocaleString() ?? "100,000"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep("pick")}
              className="bg-blue-600 py-4 rounded-2xl items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-[16px]">Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "pick" && (
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-1">
              Choose a document
            </Text>
            <Text className="text-gray-500 text-sm mb-4">
              Use a clear, well-lit photo of a valid Kenya document.
            </Text>
            {KYC_DOC_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                disabled={busy}
                onPress={() => startSession(opt.type)}
                className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 flex-row items-center"
                activeOpacity={0.8}
              >
                <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center mr-3">
                  <FileText size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-[15px]">
                    {opt.label}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">{opt.hint}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {busy ? (
              <ActivityIndicator className="mt-2" color="#2563eb" />
            ) : null}
          </View>
        )}

        {step === "capture" && smileParams && docType && (
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Scan & selfie
            </Text>
            <Text className="text-gray-500 text-sm mb-4 leading-5">
              Follow the on-screen steps. Keep your face and document fully in
              frame.
              {sandbox
                ? " Sandbox mode is on — you can complete a test approval without Smile keys."
                : ""}
            </Text>
            <SmileDocumentCapture
              params={smileParams}
              sandbox={sandbox}
              documentType={docType}
              busy={busy}
              onComplete={onCaptureComplete}
              onError={(msg) => {
                setErrorText(msg);
                setStep("failed");
              }}
            />
          </View>
        )}

        {step === "pending" && (
          <View className="bg-white rounded-3xl border border-gray-100 p-6 items-center">
            <ActivityIndicator color="#0f766e" size="large" />
            <Text className="text-gray-900 font-bold text-lg mt-4">
              Checking your documents
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-2 leading-5">
              This usually takes a few seconds. You can leave this screen open.
            </Text>
          </View>
        )}

        {step === "done" && (
          <View className="bg-white rounded-3xl border border-emerald-100 p-6 items-center">
            <CheckCircle2 size={48} color="#059669" />
            <Text className="text-gray-900 font-bold text-xl mt-4">
              You're verified
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-2 leading-5">
              Your monthly M-Pesa deposit limit is now KES{" "}
              {status?.limitKes?.toLocaleString() ??
                status?.tier2LimitKes?.toLocaleString() ??
                "100,000"}
              .
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-emerald-600 w-full py-4 rounded-2xl items-center mt-6"
            >
              <Text className="text-white font-bold text-[16px]">Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "failed" && (
          <View className="bg-white rounded-3xl border border-red-100 p-6">
            <Text className="text-gray-900 font-bold text-lg mb-2">
              Verification didn't go through
            </Text>
            <Text className="text-gray-600 text-sm leading-5 mb-5">
              {errorText ||
                "Please retry with better lighting and a clear document photo."}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setErrorText("");
                setStep("pick");
              }}
              className="bg-blue-600 py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-[16px]">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS === "ios" ? <View className="h-4" /> : null}
      </ScrollView>
    </View>
  );
}
