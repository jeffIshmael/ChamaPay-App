import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Plus,
  Shield,
  Users,
  X
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getContract
} from "thirdweb";
import { celo } from "thirdweb/chains";
import { useAuth } from "../../Contexts/AuthContext";

import { chamapayContractAddress } from "@/constants/contractAddress";
import { registerChamaToDatabase } from "@/lib/chamaService";
import { client } from "../../constants/thirdweb";

// Exchange rate constant (KES per 1 USDC);
const MINIMUM_CONTRIBUTION = 0.001;

interface FormData {
  name: string;
  description: string;
  isPublic: boolean;
  maxMembers: string; // Changed to string to show empty state
  contribution: string; // USDC amount (backend)
  contributionKES: string; // KES amount (frontend entry)
  frequency: string; // Changed to string to show empty state
  duration: number;
  startDate: string;
  startTime: string;
  adminTerms: string[];
  collateralRequired: boolean;
}

const chamapayContract = getContract({
  address: chamapayContractAddress,
  chain: celo,
  client,
});

const memberOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// Custom Checkbox Component
const CustomCheckbox = ({
  checked,
  onPress,
  color = "#10B981",
}: {
  checked: boolean;
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: checked ? color : "#6B7280",
      backgroundColor: checked ? color : "transparent",
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {checked && (
      <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
        ✓
      </Text>
    )}
  </TouchableOpacity>
);

export default function CreateChama() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isPublic: false,
    maxMembers: "", // No default
    contribution: "", // No default
    frequency: "", // No default
    duration: 0,
    startDate: "", // No default
    startTime: "", // No default
    adminTerms: [],
    collateralRequired: false,
    contributionKES: "",
  });
  const [newTerm, setNewTerm] = useState("");
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dropdown states
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [showCollateralModal, setShowCollateralModal] = useState(false);
  const [agreedToCollateral, setAgreedToCollateral] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;



  // Helper function to convert KES to USDC
  const convertToUSDC = (kesAmount: string): string => {
    const amount = parseFloat(kesAmount);
    if (isNaN(amount) || kesRate === 0) return "0.00";
    return (amount / kesRate).toFixed(3);
  };

  // Helper function to get numeric contribution value
  const getContributionValue = (): number => {
    const value = parseFloat(formData.contribution);
    return isNaN(value) ? 0 : value;
  };

  // Helper function to get numeric maxMembers value
  const getMaxMembersValue = (): number => {
    const value = parseInt(formData.maxMembers);
    return isNaN(value) ? 0 : value;
  };

  // Helper function to get numeric frequency value
  const getFrequencyValue = (): number => {
    const value = parseInt(formData.frequency);
    return isNaN(value) ? 0 : value;
  };

  // Calculate duration automatically when frequency or maxMembers changes
  useEffect(() => {
    const maxMembers = getMaxMembersValue();
    const frequency = getFrequencyValue();
    const calculatedDuration = frequency * maxMembers;
    setFormData((prev) => ({ ...prev, duration: calculatedDuration }));
  }, [formData.frequency, formData.maxMembers]);

  // Automatically set collateralRequired based on isPublic
  useEffect(() => {
    setFormData((prev) => ({ ...prev, collateralRequired: prev.isPublic }));
  }, [formData.isPublic]);

  useEffect(() => {
    globalFetchRate("KES");
  }, []);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTerm = () => {
    if (newTerm.trim() && !formData.adminTerms.includes(newTerm.trim())) {
      updateFormData("adminTerms", [...formData.adminTerms, newTerm.trim()]);
      setNewTerm("");
    }
  };

  const removeTerm = (termToRemove: string) => {
    updateFormData(
      "adminTerms",
      formData.adminTerms.filter((term) => term !== termToRemove)
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const dateString = selectedDate.toISOString().slice(0, 10);
        updateFormData("startDate", dateString);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
        const dateString = selectedDate.toISOString().slice(0, 10);
        updateFormData("startDate", dateString);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const timeString = selectedTime.toTimeString().slice(0, 5);
        updateFormData("startTime", timeString);
      }
    } else {
      if (selectedTime) {
        setTempDate(selectedTime);
        const timeString = selectedTime.toTimeString().slice(0, 5);
        updateFormData("startTime", timeString);
      }
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return "Select date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Select time";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleContributionKESChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setFormData((prev) => {
          const usdcValue = text ? (parseFloat(text) / kesRate).toFixed(3) : "";
          return {
            ...prev,
            contributionKES: text,
            contribution: usdcValue,
          };
        });
      }
    }
  };

  const handleFrequencyChange = (text: string) => {
    if (text === "" || /^\d+$/.test(text)) {
      updateFormData("frequency", text);
    }
  };

  const createChama = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a chama");
      return;
    }

    const contributionValue = getContributionValue();
    if (contributionValue < MINIMUM_CONTRIBUTION) {
      Alert.alert(
        "Error",
        `Minimum contribution is ${MINIMUM_CONTRIBUTION} USDC`
      );
      return;
    }

    setLoading(true);
    try {
      if (formData.isPublic) {
        setLoadingState("Processing...");
      }

      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}:00`
      );

      if (formData.isPublic) {
        setLoadingState("Creating...");
      } else {
        setLoadingState("Checking details...");
      }

      if (!formData.isPublic) {
        setTimeout(() => {
          setLoadingState("Creating...");
        }, 2000);
      }

      const registerChamaToDatabaseResponse = await registerChamaToDatabase(
        {
          name: formData.name,
          description: formData.description,
          type: formData.isPublic ? "Public" : "Private",
          adminTerms: JSON.stringify(formData.adminTerms),
          amount: contributionValue.toString(),
          cycleTime: getFrequencyValue(),
          maxNo: getMaxMembersValue(),
          startDate: startDateTime,
          collateralRequired: formData.isPublic,
        },
        token
      );
      if (!registerChamaToDatabaseResponse.success) {
        setLoadingState("");
        Alert.alert(
          "Error",
          registerChamaToDatabaseResponse.error ||
          "Failed to register chama to database"
        );
        return;
      }

      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxMembers: "",
        contribution: "",
        frequency: "",
        duration: 0,
        startDate: "",
        startTime: "",
        adminTerms: [],
        collateralRequired: false,
        contributionKES: "",
      });
      setStep(1);
      setLoadingState("");
      Alert.alert("Success", "Chama created successfully");
      router.push("/(tabs)");
    } catch (error: any) {
      console.error("Error creating chama:", error);
      setLoadingState("");
      Alert.alert("Error: Unable to create chama.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
      // Scroll to top when moving to next step
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      if (formData.isPublic && formData.collateralRequired) {
        setAgreedToCollateral(false);
        setShowCollateralModal(true);
      } else {
        createChama();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      // Scroll to top when moving to next step
      // scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      router.back();
    }
  };

  const CustomDropdown = ({
    placeholder,
    value,
    options,
    show,
    onToggle,
    onSelect,
  }: {
    placeholder: string;
    value: string | number;
    options: any[];
    show: boolean;
    onToggle: () => void;
    onSelect: (value: any) => void;
  }) => (
    <View className="relative">
      <TouchableOpacity
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center active:bg-gray-100"
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text
          className={`font-medium ${value ? "text-gray-900" : "text-gray-500"}`}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>
      {show && (
        <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-2 z-10 max-h-48 shadow-lg">
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                onPress={() => {
                  onSelect(typeof option === "object" ? option.value : option);
                  onToggle();
                }}
                activeOpacity={0.7}
              >
                <Text className="text-gray-900 font-medium">
                  {typeof option === "object"
                    ? option.label
                    : typeof option === "number"
                      ? `${option} ${option === 1 ? "member" : "members"}`
                      : option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View className="gap-6">
      <View className="mb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Basic Information & Financial Settings
        </Text>
        <Text className="text-sm text-gray-600">
          Tell us about your chama and set up financial details
        </Text>
      </View>
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </Text>
        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Chama Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="e.g., Tech Professionals Savings Group"
              value={formData.name}
              onChangeText={(text) => updateFormData("name", text)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Description <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="Describe the purpose and goals of your chama..."
              value={formData.description}
              onChangeText={(text) => updateFormData("description", text)}
              multiline
              numberOfLines={4}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Financial Settings
        </Text>
        <View className="gap-4">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Maximum Members <Text className="text-red-500">*</Text>
              </Text>
              <CustomDropdown
                placeholder="Select members"
                value={
                  formData.maxMembers ? `${formData.maxMembers} members` : ""
                }
                options={memberOptions}
                show={showMembersDropdown}
                onToggle={() => setShowMembersDropdown(!showMembersDropdown)}
                onSelect={(value) =>
                  updateFormData("maxMembers", value.toString())
                }
              />
            </View>

            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Frequency (days) <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                placeholder="e.g., 7 or 30"
                value={formData.frequency}
                onChangeText={handleFrequencyChange}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Start Date <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(
                    formData.startDate
                      ? new Date(formData.startDate)
                      : new Date(Date.now() + 24 * 60 * 60 * 1000)
                  );
                  setShowDatePicker(true);
                  setPickerMode("date");
                }}
                className={`bg-gray-50 border rounded-xl px-4 py-3 flex-row items-center justify-between active:bg-gray-100 ${!isStartDateTimeInFuture() && formData.startDate.trim() !== ""
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
                  }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-medium ${formData.startDate ? "text-gray-900" : "text-gray-500"}`}
                >
                  {formatDate(formData.startDate)}
                </Text>
                <Calendar size={20} color="#6b7280" />
              </TouchableOpacity>
              {!isStartDateTimeInFuture() &&
                formData.startDate.trim() !== "" && (
                  <Text className="text-red-600 text-xs mt-1">
                    Start date must be in the future
                  </Text>
                )}
            </View>

            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Start Time <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (formData.startTime) {
                    const [hours, minutes] = formData.startTime.split(":");
                    const date = new Date(formData.startDate || Date.now());
                    date.setHours(parseInt(hours), parseInt(minutes));
                    setSelectedDate(date);
                  } else {
                    setSelectedDate(new Date());
                  }
                  setShowTimePicker(true);
                  setPickerMode("time");
                }}
                className={`bg-gray-50 border rounded-xl px-4 py-3 flex-row items-center justify-between active:bg-gray-100 ${!isStartDateTimeInFuture() && formData.startTime.trim() !== ""
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
                  }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-medium ${formData.startTime ? "text-gray-900" : "text-gray-500"}`}
                >
                  {formatTime(formData.startTime)}
                </Text>
                <Clock size={20} color="#6b7280" />
              </TouchableOpacity>
              {!isStartDateTimeInFuture() &&
                formData.startTime.trim() !== "" && (
                  <Text className="text-red-600 text-xs mt-1">
                    Start time must be in the future
                  </Text>
                )}
            </View>
          </View>

          {/* <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Duration (days)
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Text className="text-gray-900 font-semibold">
                {formData.duration > 0 ? `${formData.duration} days` : "Not calculated yet"} (calculated automatically)
              </Text>
              {formData.duration > 0 && (
                <Text className="text-gray-600 text-sm mt-1">
                  Frequency ({formData.frequency} days) × Members (
                  {formData.maxMembers})
                </Text>
              )}
            </View>
          </View> */}

          <View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-gray-700">
                Contribution Amount (KES){" "}
                <Text className="text-red-500">*</Text>
              </Text>
              {kesRate > 0 && (
                <Text className="text-xs text-gray-500">
                  Min: {(MINIMUM_CONTRIBUTION * kesRate).toFixed(0)} KES
                </Text>
              )}
            </View>
            <TextInput
              placeholder="e.g., 500"
              value={formData.contributionKES}
              onChangeText={handleContributionKESChange}
              keyboardType="decimal-pad"
              className={`bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 ${getContributionValue() < MINIMUM_CONTRIBUTION &&
                formData.contributionKES !== ""
                ? "border-red-300 bg-red-50"
                : "border-gray-200"
                }`}
              placeholderTextColor="#9ca3af"
            />
            {formData.contributionKES !== "" && getContributionValue() > 0 && (
              <View className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Text className="text-blue-900 text-xs font-medium">
                  ≈ {formData.contribution} USDC (at 1 USDC = KES{" "}
                  {kesRate.toFixed(2)})
                </Text>
              </View>
            )}
            {getContributionValue() < MINIMUM_CONTRIBUTION &&
              formData.contributionKES !== "" && (
                <Text className="text-red-600 text-xs mt-1">
                  Minimum contribution is {MINIMUM_CONTRIBUTION} USDC (≈{" "}
                  {(MINIMUM_CONTRIBUTION * kesRate).toFixed(0)} KES)
                </Text>
              )}
          </View>

          {formData.contribution &&
            formData.maxMembers &&
            formData.frequency &&
            formData.startDate &&
            formData.startTime && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Text className="text-blue-900 font-semibold mb-2 text-base">
                      Financial Summary
                    </Text>
                    <Text className="text-blue-800 text-sm">
                      • Total pool per payout:{" "}
                      {Math.ceil(getContributionValue() * getMaxMembersValue() * kesRate).toLocaleString()} KES (≈{" "}
                      {(getContributionValue() * getMaxMembersValue()).toFixed(2)} USDC)
                      {"\n"}• Each contribution:{" "}
                      {Math.ceil(getContributionValue() * kesRate).toLocaleString()} KES (≈{" "}
                      {getContributionValue().toFixed(3)} USDC)
                      {"\n"}• Frequency: {formData.frequency} days
                      {"\n"}• Starts: {formatDate(formData.startDate)} at{" "}
                      {formatTime(formData.startTime)}
                      {!isStartDateTimeInFuture() &&
                        formData.startDate.trim() !== "" && (
                          <Text className="text-red-600">
                            {"\n"}• Start date/time must be in the future
                          </Text>
                        )}
                    </Text>
                  </View>
                </View>
              </View>
            )}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="gap-6">
      <View className="mb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Privacy & Review
        </Text>
        <Text className="text-sm text-gray-600">
          Choose privacy settings and review details
        </Text>
      </View>
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <View
          className={`flex-row items-center justify-between p-5  border border-downy-100 rounded-xl ${formData.isPublic ? "bg-emerald-50" : "bg-gray-50"}`}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-full bg-white items-center justify-center border border-emerald-200">
              <Users size={20} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 text-base">
                Chama Type
              </Text>
              <Text className="text-sm text-gray-600 mt-0.5">
                {formData.isPublic
                  ? "Public - Anyone can join"
                  : "Private - Invitation only"}
              </Text>
            </View>
          </View>
          <Switch
            value={formData.isPublic}
            onValueChange={(value) => updateFormData("isPublic", value)}
            trackColor={{ false: "#d1d5db", true: "#10b981" }}
            thumbColor={formData.isPublic ? "#ffffff" : "#ffffff"}
          />
        </View>

        {formData.isPublic && (
          <View className="p-5 bg-amber-50 border border-amber-200 rounded-xl mt-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-white items-center justify-center border border-amber-200">
                <Shield size={20} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 text-base">
                  Collateral Required
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Members must provide collateral that caters for one cycle.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2 mt-4">
            Admin Requirements
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            Define the requirements for members to join your chama
          </Text>
          <View className="flex-row gap-2 mb-2">
            <TextInput
              placeholder="e.g., Must be a tech professional"
              value={newTerm}
              onChangeText={setNewTerm}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[44px]"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={addTerm}
              className="bg-emerald-600 w-12 h-12 rounded-xl items-center justify-center active:bg-emerald-700"
              activeOpacity={0.7}
            >
              <Plus size={20} color={"#fff"} />
            </TouchableOpacity>
          </View>
          {formData.adminTerms.length > 0 && (
            <View className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                Requirements ({formData.adminTerms.length})
              </Text>
              <View className="gap-3">
                {formData.adminTerms.map((term, index) => (
                  <View
                    key={index}
                    className="flex-row items-start gap-3 bg-white rounded-lg p-3 border border-gray-200"
                  >
                    <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center flex-shrink-0">
                      <Text className="text-emerald-700 text-xs font-bold">
                        {index + 1}
                      </Text>
                    </View>
                    <View className="flex-1 flex-row items-center justify-between">
                      <Text className="text-sm text-gray-700 flex-1 font-medium">
                        {term}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeTerm(term)}
                        className="w-6 h-6 rounded-full bg-red-50 items-center justify-center active:bg-red-100"
                        activeOpacity={0.7}
                      >
                        <X size={14} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <Text className="text-emerald-900 font-semibold mb-3 text-base">
            Summary
          </Text>
          <View className="gap-2">
            <Text className="text-emerald-800 text-sm font-medium">
              • Name:{" "}
              <Text className="font-normal">{formData.name || "Not set"}</Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • Members:{" "}
              <Text className="font-normal">
                {formData.maxMembers || "Not set"}
              </Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • Contribution:{" "}
              <Text className="font-normal">
                {formData.contributionKES
                  ? `${Math.ceil(parseFloat(formData.contributionKES)).toLocaleString()} KES (${formData.contribution} USDC)`
                  : "Not set"}
              </Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • Frequency:{" "}
              <Text className="font-normal">
                {formData.frequency ? `${formData.frequency} days` : "Not set"}
              </Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • One Cycle Duration:{" "}
              <Text className="font-normal">
                {formData.duration > 0
                  ? `${formData.duration} days`
                  : "Not calculated"}
              </Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • Start:{" "}
              <Text className="font-normal">
                {formData.startDate && formData.startTime
                  ? `${formatDate(formData.startDate)} at ${formatTime(formData.startTime)}`
                  : "Not set"}
              </Text>
            </Text>
            <Text className="text-emerald-800 text-sm font-medium">
              • Type:{" "}
              <Text className="font-normal">
                {formData.isPublic ? "Public" : "Private"}
              </Text>
            </Text>
            {formData.isPublic &&
              formData.contribution &&
              formData.maxMembers && (
                <Text className="text-emerald-800 text-sm font-medium">
                  • Collateral Required:{" "}
                  <Text className="font-normal">
                    {kesRate > 0
                      ? `${Math.ceil(Number(formData.contribution) * Number(formData.maxMembers) * kesRate).toLocaleString()} KES (${(Number(formData.contribution) * Number(formData.maxMembers)).toFixed(3)} USDC)`
                      : `${(Number(formData.contribution) * Number(formData.maxMembers)).toFixed(3)} USDC`}
                  </Text>
                </Text>
              )}
            {formData.adminTerms.length > 0 && (
              <>
                <Text className="text-emerald-800 text-sm font-semibold mt-2">
                  • Requirements:
                </Text>
                {formData.adminTerms.map((term, index) => (
                  <Text
                    key={index}
                    className="text-emerald-800 text-sm pl-4 font-medium"
                  >
                    {index + 1}. <Text className="font-normal">{term}</Text>
                  </Text>
                ))}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  // Check if start date and time are in the future
  const isStartDateTimeInFuture = () => {
    if (!formData.startDate || !formData.startTime) return false;
    const now = new Date();
    const startDateTime = new Date(
      `${formData.startDate}T${formData.startTime}:00`
    );
    return startDateTime > now;
  };

  const isStep1Valid =
    formData.name.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.contribution.trim() !== "" &&
    getContributionValue() >= MINIMUM_CONTRIBUTION &&
    formData.frequency.trim() !== "" &&
    getFrequencyValue() > 0 &&
    formData.maxMembers.trim() !== "" &&
    getMaxMembersValue() > 0 &&
    formData.startDate.trim() !== "" &&
    formData.startTime.trim() !== "" &&
    isStartDateTimeInFuture();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-white">Create Chama</Text>
            <Text className="text-sm text-white/80 mt-1">Step {step} of 2</Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Progress */}
        <View className="flex-row gap-2">
          {[1, 2].map((stepNumber) => (
            <View
              key={stepNumber}
              className={`flex-1 h-2 rounded-full ${stepNumber <= step ? "bg-white" : "bg-white/30"
                }`}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View className="px-6 py-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            {/* Navigation */}
            <View className="flex-row gap-3 mt-6 mb-4">
              <TouchableOpacity
                onPress={handleBack}
                className={`flex-1 py-4 border-2 rounded-xl items-center justify-center ${step === 1
                  ? "border-gray-200 bg-gray-50 opacity-50"
                  : "border-gray-300 bg-white active:bg-gray-50"
                  }`}
                disabled={step === 1}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-semibold text-base ${step === 1 ? "text-gray-400" : "text-gray-700"
                    }`}
                >
                  {step === 1 ? "Cancel" : "←   Previous"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                className="flex-1 py-4 rounded-xl items-center justify-center overflow-hidden relative"
                disabled={(step === 1 && !isStep1Valid) || loading}
                activeOpacity={0.8}
              >
                {/* Progress Background */}
                {step === 1 && isStep1Valid ? (
                  <>
                    <View className="absolute left-0 top-0 bottom-0 right-0  bg-downy-600" />
                  </>
                ) : step === 2 ? (
                  <View className="absolute left-0 top-0 bottom-0 right-0 bg-downy-600" />
                ) : (
                  <View className="absolute left-0 top-0 bottom-0 right-0 bg-gray-300" />
                )}
                <Text
                  className={`font-semibold text-base relative z-10 ${(step === 1 && !isStep1Valid) || loading
                    ? "text-gray-200"
                    : "text-white"
                    }`}
                >
                  {loading
                    ? loadingState || "Creating..."
                    : step === 2
                      ? "Create Chama"
                      : "Next  →"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date/Time Pickers */}
      <Modal
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
        transparent={true}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => setShowDatePicker(false)}
          />
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 24,
              margin: 20,
              width: "90%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                textAlign: "center",
                color: "#111827",
              }}
            >
              Select Date
            </Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="compact"
              onChange={handleDateChange}
              style={{ backgroundColor: "white" }}
            />
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={{
                backgroundColor: "#059669",
                padding: 14,
                borderRadius: 12,
                marginTop: 20,
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
        transparent={true}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => setShowTimePicker(false)}
          />
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 24,
              margin: 20,
              width: "90%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                textAlign: "center",
                color: "#111827",
              }}
            >
              Select Time
            </Text>
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="compact"
              onChange={handleTimeChange}
              style={{ backgroundColor: "white" }}
            />
            <TouchableOpacity
              onPress={() => setShowTimePicker(false)}
              style={{
                backgroundColor: "#059669",
                padding: 14,
                borderRadius: 12,
                marginTop: 20,
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Collateral Requirement Modal */}
      <Modal
        visible={showCollateralModal}
        onRequestClose={() => setShowCollateralModal(false)}
        transparent={true}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              margin: 20,
              width: "95%",
            }}
          >
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: "#FEF3C7",
                }}
              >
                <Shield size={32} color="#F59E0B" />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#111827",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Collateral Required
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                For public chamas, members must provide collateral as a security
                measure
              </Text>
            </View>

            <View className="mb-6">
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                What you need to know:
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-start">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#10B981",
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    You'll lock{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {(
                        getContributionValue() * getMaxMembersValue()
                      ).toLocaleString()}{" "}
                      USDC
                    </Text>{" "}
                    as collateral
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#10B981",
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    Payments can be deducted from your locked amount
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#10B981",
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    Collateral is fully refundable when you leave the chama
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#10B981",
                      marginTop: 6,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    This is a security measure in case a member defaults
                    payment, ensuring the cycle continues without disruption
                  </Text>
                </View>
              </View>
            </View>

            {/* Agreement Checkbox */}
            <View className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <View className="flex-row items-start">
                <CustomCheckbox
                  checked={agreedToCollateral}
                  onPress={() => setAgreedToCollateral(!agreedToCollateral)}
                  color="#1a6b6b"
                />
                <View className="flex-1 ml-3">
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#374151",
                      lineHeight: 20,
                    }}
                  >
                    I understand that I will lock{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {(
                        getContributionValue() * getMaxMembersValue()
                      ).toLocaleString()}{" "}
                      USDC
                    </Text>{" "}
                    as collateral and agree to the terms outlined above.
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCollateralModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "gray",
                  alignItems: "center",
                }}
              // className="bg-gray-400"
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowCollateralModal(false);
                  createChama();
                }}
                disabled={!agreedToCollateral}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                className={`${agreedToCollateral ? "bg-downy-700" : "bg-gray-300"}`}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: agreedToCollateral ? "white" : "#9CA3AF",
                  }}
                >
                  Proceed →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
