import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { createGoal, GoalType, goalTypeLabel } from "@/lib/goalService";
import { registerChamaToDatabase } from "@/lib/chamaService";
import CountrySelector from "@/components/CountrySelector";
import { DEFAULT_PHONE_COUNTRY } from "@/Utils/phoneCountries";
import { formatPhoneNumber, type Country } from "@/Utils/pretiumUtils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Calendar, Check, ChevronDown, Clock, Info, Sparkles, Target, AlertTriangle, TrendingUp, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../Contexts/AuthContext";
import {
  formatAmountTyping,
  parseAmountTyping,
  sanitizeAmountInput,
} from "@/Utils/helperFunctions";

const MINIMUM_KES = 100;
const MINIMUM_CONTRIBUTION = 0.8;

type CreateMode = "chama" | "goal";

const GOAL_TYPE_OPTIONS: Array<{
  type: GoalType;
  label: string;
  description: string;
}> = [
  {
    type: "personal",
    label: "Personal",
    description:
      "Just you — share the pay link if friends want to top you up.",
  },
  {
    type: "invite",
    label: "Invite circle",
    description:
      "Add members later and save together transparently.",
  },
  {
    type: "public",
    label: "Public / Harambee",
    description:
      "Share the pay link widely for open contributions.",
  },
];

interface ChamaForm {
  name: string;
  contribution: string;
  contributionKES: string;
  frequency: string;
  startDate: string;
  startTime: string;
}

interface GoalForm {
  name: string;
  description: string;
  goalType: GoalType;
  target: string;
  targetKES: string;
  endDate: string;
  yieldEnabled: boolean;
  notifyPhone: string;
}

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const { platformRate: kesRate } = useFormattedBalance();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<CreateMode>(
    params.mode === "goal" ? "goal" : "chama"
  );

  useEffect(() => {
    if (params.mode === "goal") setMode("goal");
    else if (params.mode === "chama") setMode("chama");
  }, [params.mode]);
  const [loading, setLoading] = useState(false);
  const [isKESMode, setIsKESMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);
  const [showGoalTypePicker, setShowGoalTypePicker] = useState(false);
  const [showYieldInfoModal, setShowYieldInfoModal] = useState(false);
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<Country>(DEFAULT_PHONE_COUNTRY);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goalEndDate, setGoalEndDate] = useState(new Date(Date.now() + 30 * 86400000));

  const emptyChamaForm = (): ChamaForm => ({
    name: "",
    contribution: "",
    contributionKES: "",
    frequency: "",
    startDate: "",
    startTime: "",
  });

  const emptyGoalForm = (): GoalForm => ({
    name: "",
    description: "",
    goalType: "personal",
    target: "",
    targetKES: "",
    endDate: "",
    yieldEnabled: false,
    notifyPhone: "",
  });

  const [chamaForm, setChamaForm] = useState<ChamaForm>(emptyChamaForm);
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoalForm);

  const resetForms = useCallback(() => {
    setChamaForm(emptyChamaForm());
    setGoalForm(emptyGoalForm());
    setPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setSelectedDate(new Date());
    setGoalEndDate(new Date(Date.now() + 30 * 86400000));
    setLoading(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowGoalDatePicker(false);
    setShowGoalTypePicker(false);
    setShowYieldInfoModal(false);
    setShowPhoneCountryPicker(false);
  }, []);

  // Clear inputs when leaving the create screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetForms();
      };
    }, [resetForms])
  );

  useEffect(() => {
    if (user?.location === "KE") setIsKESMode(true);
  }, [user]);

  const updateChama = (field: keyof ChamaForm, value: string) =>
    setChamaForm((p) => ({ ...p, [field]: value }));

  const updateGoal = <K extends keyof GoalForm>(field: K, value: GoalForm[K]) =>
    setGoalForm((p) => ({ ...p, [field]: value }));

  const minUsdc = kesRate > 0 ? MINIMUM_KES / kesRate : MINIMUM_CONTRIBUTION;

  const chamaContributionValid = () => {
    if (isKESMode) {
      const v = parseAmountTyping(chamaForm.contributionKES);
      return chamaForm.contributionKES.trim() !== "" && v >= MINIMUM_KES;
    }
    const v = parseAmountTyping(chamaForm.contribution);
    return chamaForm.contribution.trim() !== "" && v >= minUsdc;
  };

  const goalTargetValid = () => {
    if (isKESMode) {
      const v = parseAmountTyping(goalForm.targetKES);
      return goalForm.targetKES.trim() !== "" && v >= MINIMUM_KES;
    }
    const v = parseAmountTyping(goalForm.target);
    return goalForm.target.trim() !== "" && v >= minUsdc;
  };

  const onChamaKes = (text: string) => {
    const formatted = formatAmountTyping(text, true);
    const raw = sanitizeAmountInput(formatted, true);
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      const usdc =
        raw && raw !== "." && kesRate > 0
          ? formatAmountTyping((parseFloat(raw) / kesRate).toFixed(6))
          : "";
      setChamaForm((p) => ({ ...p, contributionKES: formatted, contribution: usdc }));
    }
  };
  const onChamaUsdc = (text: string) => {
    const formatted = formatAmountTyping(text, true);
    const raw = sanitizeAmountInput(formatted, true);
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      const kes =
        raw && raw !== "." && kesRate > 0
          ? formatAmountTyping((parseFloat(raw) * kesRate).toFixed(2))
          : "";
      setChamaForm((p) => ({ ...p, contribution: formatted, contributionKES: kes }));
    }
  };
  const onGoalKes = (text: string) => {
    const formatted = formatAmountTyping(text, true);
    const raw = sanitizeAmountInput(formatted, true);
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      const usdc =
        raw && raw !== "." && kesRate > 0
          ? formatAmountTyping((parseFloat(raw) / kesRate).toFixed(6))
          : "";
      setGoalForm((p) => ({ ...p, targetKES: formatted, target: usdc }));
    }
  };
  const onGoalUsdc = (text: string) => {
    const formatted = formatAmountTyping(text, true);
    const raw = sanitizeAmountInput(formatted, true);
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      const kes =
        raw && raw !== "." && kesRate > 0
          ? formatAmountTyping((parseFloat(raw) * kesRate).toFixed(2))
          : "";
      setGoalForm((p) => ({ ...p, target: formatted, targetKES: kes }));
    }
  };

  const isStartDateTimeInFuture = () => {
    if (!chamaForm.startDate || !chamaForm.startTime) return true;
    const [h, m] = chamaForm.startTime.split(":");
    const d = new Date(chamaForm.startDate);
    d.setHours(parseInt(h), parseInt(m));
    return d > new Date();
  };

  const chamaValid =
    chamaForm.name.trim() &&
    chamaContributionValid() &&
    chamaForm.frequency.trim() &&
    parseInt(chamaForm.frequency) > 0 &&
    chamaForm.startDate &&
    chamaForm.startTime &&
    isStartDateTimeInFuture();

  const goalValid =
    goalForm.name.trim() &&
    goalForm.description.trim() &&
    goalTargetValid() &&
    goalForm.endDate.trim() &&
    new Date(goalForm.endDate) > new Date();

  const createChama = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a chama");
      return;
    }
    setLoading(true);
    let ok = false;
    try {
      const startDateTime = new Date(`${chamaForm.startDate}T${chamaForm.startTime}:00`);
      const response = await registerChamaToDatabase(
        {
          name: chamaForm.name,
          description: "",
          type: "Private",
          adminTerms: "[]",
          amount: (parseAmountTyping(chamaForm.contribution) || 0).toString(),
          cycleTime: parseInt(chamaForm.frequency) || 0,
          maxNo: 0,
          startDate: startDateTime,
          collateralRequired: false,
        },
        token
      );
      if (!response.success) {
        Alert.alert("Error", response.error || "Failed to register chama");
        return;
      }
      ok = true;
      Keyboard.dismiss();
      resetForms();
      if (Platform.OS === "android") ToastAndroid.show("Chama created successfully", ToastAndroid.SHORT);
      else Alert.alert("Success", "Chama created successfully");
      router.push("/(tabs)");
      requestAnimationFrame(() => queryClient.invalidateQueries({ queryKey: ["userChamas"] }));
    } catch {
      Alert.alert("Error", "Unable to create chama.");
    } finally {
      if (!ok) setLoading(false);
    }
  };

  const createGoalAction = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a goal");
      return;
    }
    setLoading(true);
    let ok = false;
    try {
      const yieldEnabled =
        goalForm.goalType === "public" ? false : goalForm.yieldEnabled;
      const localPhone = goalForm.notifyPhone.replace(/\D/g, "").replace(/^0+/, "");
      const notifyPhone = localPhone
        ? formatPhoneNumber(phoneCountry.phoneCode, localPhone)
        : undefined;
      const response = await createGoal(token, {
        name: goalForm.name.trim(),
        description: goalForm.description.trim(),
        goalType: goalForm.goalType,
        targetAmount: (parseAmountTyping(goalForm.target) || 0).toString(),
        endDate: new Date(`${goalForm.endDate}T23:59:59`).toISOString(),
        yieldEnabled,
        notifyPhone,
      });
      if (!response.success || !response.goal) {
        Alert.alert("Error", response.error || "Failed to create goal");
        return;
      }
      ok = true;
      Keyboard.dismiss();
      resetForms();
      if (Platform.OS === "android") ToastAndroid.show("Goal created successfully", ToastAndroid.SHORT);
      queryClient.invalidateQueries({ queryKey: ["userGoals"] });
      router.replace({
        pathname: "/(tabs)",
        params: { tab: "goals" },
      });
    } catch {
      Alert.alert("Error", "Unable to create goal.");
    } finally {
      if (!ok) setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Select date";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Select time";
    const [hoursStr, minutes] = timeString.split(":");
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const selectedGoalType =
    GOAL_TYPE_OPTIONS.find((o) => o.type === goalForm.goalType) ||
    GOAL_TYPE_OPTIONS[0];

  const SectionHeader = ({
    title,
    subtitle,
    step,
  }: {
    title: string;
    subtitle?: string;
    step: string;
  }) => (
    <View className="mb-5">
      <View className="flex-row items-center gap-2.5 mb-1">
        <View className="bg-downy-100 px-2.5 py-1 rounded-full">
          <Text className="text-[11px] font-bold text-downy-800">{step}</Text>
        </View>
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
      </View>
      {subtitle ? (
        <Text className="text-sm text-gray-500 leading-5 pl-0.5">{subtitle}</Text>
      ) : null}
    </View>
  );

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <Text className="text-[13px] font-semibold text-gray-600 mb-2 tracking-wide">
      {children}
    </Text>
  );

  const inputClass =
    "bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-[15px]";

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <Text className="text-center text-2xl font-bold text-white">Create</Text>
        <Text className="text-center text-white/80 text-sm leading-5 mt-2 px-2">
          Create a chama (rotational saving group) or save for goal.
        </Text>
      </View>

      <View className="px-5 pt-4 pb-2">
        <View className="flex-row bg-white border border-gray-100 rounded-2xl p-1 shadow-sm">
          <TouchableOpacity
            onPress={() => setMode("chama")}
            activeOpacity={0.9}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
              mode === "chama" ? "bg-downy-600" : ""
            }`}
          >
            <Users
              size={16}
              color={mode === "chama" ? "#ffffff" : "#6b7280"}
            />
            <Text
              className={`ml-2 font-semibold text-[15px] ${
                mode === "chama" ? "text-white" : "text-gray-600"
              }`}
            >
              Chama
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("goal")}
            activeOpacity={0.9}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
              mode === "goal" ? "bg-downy-600" : ""
            }`}
          >
            <Target
              size={16}
              color={mode === "goal" ? "#ffffff" : "#6b7280"}
            />
            <Text
              className={`ml-2 font-semibold text-[15px] ${
                mode === "goal" ? "text-white" : "text-gray-600"
              }`}
            >
              Goal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {mode === "chama" ? (
            <View className="px-5 pt-3 gap-5">
              <View className="px-1 py-1">
                <Text className="text-base font-bold text-gray-900">
                  Rotational savings
                </Text>
                <Text className="text-sm text-gray-500 mt-1 leading-5">
                  Members contribute on a schedule — each round, one person gets the pot.
                </Text>
              </View>

              <View
                className="bg-white rounded-3xl border border-gray-100 p-5"
                style={{
                  shadowColor: "#0f766e",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <SectionHeader
                  step="01"
                  title="About your chama"
                  subtitle="Give it a name people will recognize"
                />
                <View>
                  <FieldLabel>
                    Chama name <Text className="text-red-500">*</Text>
                  </FieldLabel>
                  <TextInput
                    placeholder="e.g., Tech Professionals Savings"
                    placeholderTextColor="#9ca3af"
                    value={chamaForm.name}
                    onChangeText={(t) => updateChama("name", t)}
                    className={inputClass}
                  />
                </View>
              </View>

              <View
                className="bg-white rounded-3xl border border-gray-100 p-5"
                style={{
                  shadowColor: "#0f766e",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <SectionHeader
                  step="02"
                  title="Money & schedule"
                  subtitle="How often and how much each member puts in"
                />
                <View className="gap-4">
                  <View>
                    <FieldLabel>
                      Contribution cycle <Text className="text-red-500">*</Text>
                    </FieldLabel>
                    <View className="flex-row gap-2 mb-3">
                      {[
                        { days: "7", label: "Weekly" },
                        { days: "14", label: "Biweekly" },
                        { days: "30", label: "Monthly" },
                      ].map((opt) => {
                        const active = chamaForm.frequency === opt.days;
                        return (
                          <TouchableOpacity
                            key={opt.days}
                            onPress={() => updateChama("frequency", opt.days)}
                            className={`flex-1 py-3 rounded-xl border relative ${
                              active
                                ? "bg-downy-50 border-downy-400"
                                : "bg-white border-gray-200"
                            }`}
                            activeOpacity={0.85}
                          >
                            {active && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 6,
                                  right: 6,
                                  zIndex: 2,
                                }}
                                className="w-4 h-4 rounded-full bg-downy-600 items-center justify-center"
                              >
                                <Check size={10} color="white" strokeWidth={3} />
                              </View>
                            )}
                            <View className="items-center">
                              <Text
                                className={`text-xs font-bold ${
                                  active ? "text-downy-800" : "text-gray-700"
                                }`}
                              >
                                {opt.label}
                              </Text>
                              <Text
                                className={`text-[10px] mt-0.5 ${
                                  active ? "text-downy-600" : "text-gray-400"
                                }`}
                              >
                                {opt.days} days
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      placeholder="Or enter custom days"
                      placeholderTextColor="#9ca3af"
                      value={chamaForm.frequency}
                      onChangeText={(t) => {
                        if (t === "" || /^\d+$/.test(t)) updateChama("frequency", t);
                      }}
                      keyboardType="numeric"
                      className={inputClass}
                    />
                  </View>

                  <View className="gap-4">
                    <View>
                      <FieldLabel>
                        First payout date <Text className="text-red-500">*</Text>
                      </FieldLabel>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
                        activeOpacity={0.85}
                      >
                        <Text
                          className={`text-[15px] font-medium ${
                            chamaForm.startDate ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {formatDate(chamaForm.startDate)}
                        </Text>
                        <Calendar size={18} color="#0f766e" />
                      </TouchableOpacity>
                    </View>
                    <View>
                      <FieldLabel>
                        Payout time <Text className="text-red-500">*</Text>
                      </FieldLabel>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(true)}
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
                        activeOpacity={0.85}
                      >
                        <Text
                          className={`text-[15px] font-medium ${
                            chamaForm.startTime ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {formatTime(chamaForm.startTime)}
                        </Text>
                        <Clock size={18} color="#0f766e" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View>
                    <View className="flex-row justify-between items-center mb-2">
                      <FieldLabel>
                        Contribution ({isKESMode ? "KES" : "USDC"}){" "}
                        <Text className="text-red-500">*</Text>
                      </FieldLabel>
                      {user?.location === "KE" && (
                        <TouchableOpacity
                          onPress={() => setIsKESMode(!isKESMode)}
                          className="bg-downy-50 px-2.5 py-1 rounded-full border border-downy-100"
                        >
                          <Text className="text-downy-800 text-[10px] font-bold">
                            Use {isKESMode ? "USDC" : "KES"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <View className="px-4 py-3.5 bg-gray-50 border-r border-gray-200">
                        <Text className="text-sm font-bold text-gray-600">
                          {isKESMode ? "KES" : "USDC"}
                        </Text>
                      </View>
                      <TextInput
                        placeholder={isKESMode ? "500" : "5"}
                        placeholderTextColor="#9ca3af"
                        value={isKESMode ? chamaForm.contributionKES : chamaForm.contribution}
                        onChangeText={isKESMode ? onChamaKes : onChamaUsdc}
                        keyboardType="decimal-pad"
                        className="flex-1 px-4 py-3.5 text-gray-900 text-[15px] font-semibold"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={createChama}
                disabled={!chamaValid || loading}
                className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
                  chamaValid ? "bg-downy-600" : "bg-gray-300"
                }`}
                style={
                  chamaValid
                    ? {
                        shadowColor: "#0f766e",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }
                    : undefined
                }
                activeOpacity={0.9}
              >
                <Users size={18} color="white" />
                <Text className="font-bold text-base text-white">
                  {loading ? "Creating..." : "Create Chama"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="px-5 pt-3 gap-5">
              <View className="px-1 py-1">
                <Text className="text-base font-bold text-gray-900">
                  Save toward a target
                </Text>
                <Text className="text-sm text-gray-500 mt-1 leading-5">
                  Personal, invite friends, or go public. Optional yield on Moonwell.
                </Text>
              </View>

              <View
                className="bg-white rounded-3xl border border-gray-100 p-5"
                style={{
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <SectionHeader
                  step="01"
                  title="Goal type"
                  subtitle="Who can contribute to this pot"
                />
                <TouchableOpacity
                  onPress={() => setShowGoalTypePicker(true)}
                  className="bg-downy-50/80 border border-downy-100 rounded-2xl px-4 py-4 flex-row items-center justify-between"
                  activeOpacity={0.8}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[11px] font-bold text-downy-700 uppercase tracking-wider mb-1">
                      Selected
                    </Text>
                    <Text className="text-base font-bold text-gray-900">
                      {selectedGoalType.label}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1.5 leading-4">
                      {selectedGoalType.description}
                    </Text>
                  </View>
                  <View className="w-9 h-9 rounded-full bg-white border border-downy-100 items-center justify-center">
                    <ChevronDown size={18} color="#0f766e" />
                  </View>
                </TouchableOpacity>
              </View>

              <View
                className="bg-white rounded-3xl border border-gray-100 p-5"
                style={{
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <SectionHeader
                  step="02"
                  title="The story"
                  subtitle="Name it and say what you’re raising for"
                />
                <View className="gap-4">
                  <View>
                    <FieldLabel>
                      Goal name <Text className="text-red-500">*</Text>
                    </FieldLabel>
                    <TextInput
                      placeholder="e.g., Laptop fund"
                      placeholderTextColor="#9ca3af"
                      value={goalForm.name}
                      onChangeText={(t) => updateGoal("name", t)}
                      className={inputClass}
                    />
                  </View>
                  <View>
                    <FieldLabel>
                      Description <Text className="text-red-500">*</Text>
                    </FieldLabel>
                    <TextInput
                      placeholder="Why are you saving?"
                      placeholderTextColor="#9ca3af"
                      value={goalForm.description}
                      onChangeText={(t) => updateGoal("description", t)}
                      multiline
                      numberOfLines={4}
                      className={`${inputClass} h-28`}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              <View
                className="bg-white rounded-3xl border border-gray-100 p-5"
                style={{
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <SectionHeader
                  step="03"
                  title="Target & extras"
                  subtitle="How much, by when, and optional alerts"
                />
                <View className="gap-4">
                  <View>
                    <View className="flex-row justify-between items-center mb-2">
                      <FieldLabel>
                        Target amount <Text className="text-red-500">*</Text>
                      </FieldLabel>
                      {user?.location === "KE" && (
                        <TouchableOpacity
                          onPress={() => setIsKESMode(!isKESMode)}
                          className="bg-downy-50 px-2.5 py-1 rounded-full border border-downy-100"
                        >
                          <Text className="text-downy-800 text-[10px] font-bold">
                            Use {isKESMode ? "USDC" : "KES"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <View className="px-4 py-3.5 bg-gray-50 border-r border-gray-200">
                        <Text className="text-sm font-bold text-gray-600">
                          {isKESMode ? "KES" : "USDC"}
                        </Text>
                      </View>
                      <TextInput
                        placeholder={isKESMode ? "50000" : "400"}
                        placeholderTextColor="#9ca3af"
                        value={isKESMode ? goalForm.targetKES : goalForm.target}
                        onChangeText={isKESMode ? onGoalKes : onGoalUsdc}
                        keyboardType="decimal-pad"
                        className="flex-1 px-4 py-3.5 text-gray-900 text-[15px] font-semibold"
                      />
                    </View>
                  </View>

                  <View>
                    <FieldLabel>
                      End date <Text className="text-red-500">*</Text>
                    </FieldLabel>
                    <TouchableOpacity
                      onPress={() => setShowGoalDatePicker(true)}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
                      activeOpacity={0.85}
                    >
                      <Text
                        className={`font-medium ${
                          goalForm.endDate ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {formatDate(goalForm.endDate)}
                      </Text>
                      <Calendar size={18} color="#0f766e" />
                    </TouchableOpacity>
                  </View>

                  {goalForm.goalType !== "public" && (
                    <View
                      className={`flex-row items-center justify-between rounded-2xl px-4 py-4 border ${
                        goalForm.yieldEnabled
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <TouchableOpacity
                        className="flex-1 pr-3 flex-row items-start"
                        activeOpacity={0.75}
                        onPress={() => setShowYieldInfoModal(true)}
                      >
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                            goalForm.yieldEnabled ? "bg-emerald-100" : "bg-white"
                          }`}
                        >
                          <Sparkles
                            size={16}
                            color={goalForm.yieldEnabled ? "#059669" : "#9ca3af"}
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-sm font-bold text-gray-900 mr-1.5">
                              Put money to work
                            </Text>
                            <Info size={14} color="#059669" />
                          </View>
                          <Text className="text-xs text-gray-500 mt-1 leading-4">
                            Idle funds earn on Moonwell. Tap for details.
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <Switch
                        value={goalForm.yieldEnabled}
                        onValueChange={(v) => {
                          if (v) {
                            updateGoal("yieldEnabled", true);
                            setShowYieldInfoModal(true);
                          } else {
                            updateGoal("yieldEnabled", false);
                          }
                        }}
                        trackColor={{ false: "#d1d5db", true: "#6ee7b7" }}
                        thumbColor={goalForm.yieldEnabled ? "#059669" : "#f4f4f5"}
                      />
                    </View>
                  )}

                  {(goalForm.goalType === "public" || goalForm.goalType === "invite") && (
                    <View>
                      <FieldLabel>WhatsApp for updates</FieldLabel>
                      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-white overflow-hidden">
                        <TouchableOpacity
                          onPress={() => setShowPhoneCountryPicker(true)}
                          className="flex-row items-center px-3 h-[50px] border-r border-gray-200 bg-gray-50"
                          activeOpacity={0.8}
                        >
                          <Text className="text-lg mr-1.5">{phoneCountry.flag}</Text>
                          <Text className="text-gray-800 font-semibold mr-1">
                            +{phoneCountry.phoneCode}
                          </Text>
                          <ChevronDown size={16} color="#6b7280" />
                        </TouchableOpacity>
                        <TextInput
                          placeholder="7XX XXX XXX"
                          value={goalForm.notifyPhone}
                          onChangeText={(t) =>
                            updateGoal("notifyPhone", t.replace(/[^\d]/g, ""))
                          }
                          keyboardType="phone-pad"
                          className="flex-1 text-gray-900 px-3 h-[50px] text-[15px]"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                      <Text className="text-xs text-gray-400 mt-2 leading-4">
                        Optional — enter the local number only.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={createGoalAction}
                disabled={!goalValid || loading}
                className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
                  goalValid ? "bg-downy-600" : "bg-gray-300"
                }`}
                style={
                  goalValid
                    ? {
                        shadowColor: "#0f766e",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }
                    : undefined
                }
                activeOpacity={0.9}
              >
                <Target size={18} color="white" />
                <Text className="font-bold text-base text-white">
                  {loading ? "Creating..." : `Create ${goalTypeLabel(goalForm.goalType)} goal`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === "android" ? (
        <>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (e.type === "set" && d) {
                  updateChama("startDate", d.toISOString().slice(0, 10));
                  setSelectedDate(d);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="default"
              onChange={(e, d) => {
                setShowTimePicker(false);
                if (e.type === "set" && d) updateChama("startTime", d.toTimeString().slice(0, 5));
              }}
            />
          )}
          {showGoalDatePicker && (
            <DateTimePicker
              value={goalEndDate}
              mode="date"
              display="default"
              minimumDate={new Date(Date.now() + 86400000)}
              onChange={(e, d) => {
                setShowGoalDatePicker(false);
                if (e.type === "set" && d) {
                  setGoalEndDate(d);
                  updateGoal("endDate", d.toISOString().slice(0, 10));
                }
              }}
            />
          )}
        </>
      ) : (
        <>
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white rounded-2xl p-6 m-5 w-[90%]">
                <Text className="text-lg font-bold text-center mb-4">Select date</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="compact"
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    if (d) {
                      setSelectedDate(d);
                      updateChama("startDate", d.toISOString().slice(0, 10));
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  className="bg-downy-600 py-3 rounded-xl mt-4"
                >
                  <Text className="text-white text-center font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal visible={showTimePicker} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white rounded-2xl p-6 m-5 w-[90%]">
                <Text className="text-lg font-bold text-center mb-4">Select time</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="compact"
                  onChange={(_, d) => {
                    if (d) updateChama("startTime", d.toTimeString().slice(0, 5));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  className="bg-downy-600 py-3 rounded-xl mt-4"
                >
                  <Text className="text-white text-center font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal visible={showGoalDatePicker} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white rounded-2xl p-6 m-5 w-[90%]">
                <Text className="text-lg font-bold text-center mb-4">End date</Text>
                <DateTimePicker
                  value={goalEndDate}
                  mode="date"
                  display="compact"
                  minimumDate={new Date(Date.now() + 86400000)}
                  onChange={(_, d) => {
                    if (d) {
                      setGoalEndDate(d);
                      updateGoal("endDate", d.toISOString().slice(0, 10));
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowGoalDatePicker(false)}
                  className="bg-downy-600 py-3 rounded-xl mt-4"
                >
                  <Text className="text-white text-center font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      <Modal
        visible={showYieldInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYieldInfoModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(17,24,39,0.55)" }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowYieldInfoModal(false)}
          />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                <Sparkles size={18} color="#059669" />
              </View>
              <Text className="text-xl font-bold text-gray-900 flex-1">
                Put money to work
              </Text>
            </View>
            <Text className="text-sm text-gray-500 mb-5 leading-5">
              Here’s what happens when you turn this on for your goal.
            </Text>

            <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <Users size={16} color="#0f766e" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 mb-1">
                  Supplied to Moonwell
                </Text>
                <Text className="text-sm text-gray-500 leading-5">
                  Your goal funds are supplied to a Moonwell pool (a third-party
                  DeFi pool) to provide liquidity. ChamaPay does not hold this
                  yield pool itself.
                </Text>
              </View>
            </View>

            <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <TrendingUp size={16} color="#0f766e" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 mb-1">
                  APY is relative
                </Text>
                <Text className="text-sm text-gray-500 leading-5">
                  The APY you see can go up or down over time — it depends on
                  borrowing demand in the pool and is not guaranteed.
                </Text>
              </View>
            </View>

            <View className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <AlertTriangle size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-amber-900 mb-1">
                  Withdrawal risk
                </Text>
                <Text className="text-sm text-amber-800/80 leading-5">
                  You can withdraw only when the money is not borrowed yet. If
                  the pool’s cash is currently borrowed, your balance is still
                  yours and keeps earning — try again when free cash returns.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowYieldInfoModal(false)}
              className="bg-downy-600 py-4 rounded-2xl items-center"
              activeOpacity={0.9}
            >
              <Text className="text-white font-bold text-base">Got it</Text>
            </TouchableOpacity>

            {goalForm.yieldEnabled && (
              <TouchableOpacity
                onPress={() => {
                  updateGoal("yieldEnabled", false);
                  setShowYieldInfoModal(false);
                }}
                className="py-3 mt-2 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 font-medium text-sm">
                  Turn off instead
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGoalTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalTypePicker(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(17,24,39,0.55)" }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowGoalTypePicker(false)}
          />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
            <Text className="text-xl font-bold text-gray-900 mb-1">Choose goal type</Text>
            <Text className="text-sm text-gray-500 mb-4">
              Pick how people can contribute to this pot.
            </Text>
            {GOAL_TYPE_OPTIONS.map((option) => {
              const active = goalForm.goalType === option.type;
              return (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => {
                    updateGoal("goalType", option.type);
                    if (option.type === "public") updateGoal("yieldEnabled", false);
                    setShowGoalTypePicker(false);
                  }}
                  className={`mb-3 rounded-2xl border px-4 py-4 ${
                    active
                      ? "border-downy-500 bg-downy-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  activeOpacity={0.85}
                >
                  <Text
                    className={`text-base font-semibold mb-1 ${
                      active ? "text-downy-800" : "text-gray-900"
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text className="text-sm text-gray-500 leading-5">
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <CountrySelector
        visible={showPhoneCountryPicker}
        selectedCountry={phoneCountry}
        onSelect={setPhoneCountry}
        onClose={() => setShowPhoneCountryPicker(false)}
        variant="phone"
      />
    </View>
  );
}
