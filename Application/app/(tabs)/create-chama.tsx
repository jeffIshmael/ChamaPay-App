import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  Keyboard
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../Contexts/AuthContext";

import { registerChamaToDatabase } from "@/lib/chamaService";

const MINIMUM_KES = 100;
const MINIMUM_CONTRIBUTION = 0.8; 

interface FormData {
  name: string;
  description: string;
  maxMembers: string; 
  contribution: string; 
  contributionKES: string; 
  frequency: string; 
  startDate: string;
  startTime: string;
}

const memberOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export default function CreateChama() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    maxMembers: "", 
    contribution: "", 
    frequency: "", 
    contributionKES: "",
    startDate: "",
    startTime: "",
  });
  
  const [isKESMode, setIsKESMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);

  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;

  useEffect(() => {
    globalFetchRate("KES");
    if (user?.location === "KE") {
      setIsKESMode(true);
    }
  }, [user]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getMinimumUsdc = (): number => kesRate > 0 ? MINIMUM_KES / kesRate : MINIMUM_CONTRIBUTION;
  const getContributionValue = (): number => parseFloat(formData.contribution) || 0;
  const getMaxMembersValue = (): number => parseInt(formData.maxMembers) || 0;
  const getFrequencyValue = (): number => parseInt(formData.frequency) || 0;

  const isContributionValid = (): boolean => {
    if (isKESMode) {
      const val = parseFloat(formData.contributionKES) || 0;
      return formData.contributionKES.trim() !== "" && val >= MINIMUM_KES;
    }
    return formData.contribution.trim() !== "" && getContributionValue() >= getMinimumUsdc();
  };

  const hasContributionInput = (): boolean => isKESMode ? formData.contributionKES.trim() !== "" : formData.contribution.trim() !== "";

  const handleContributionKESChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setFormData((prev) => {
          const usdcValue = text && kesRate > 0 ? (parseFloat(text) / kesRate).toFixed(3) : "";
          return { ...prev, contributionKES: text, contribution: usdcValue };
        });
      }
    }
  };

  const handleContributionUSDCChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setFormData((prev) => {
          const kesValue = text && kesRate > 0 ? (parseFloat(text) * kesRate).toFixed(2) : "";
          return { ...prev, contribution: text, contributionKES: kesValue };
        });
      }
    }
  };

  const isStartDateTimeInFuture = () => {
    if (!formData.startDate || !formData.startTime) return true;
    const [hours, minutes] = formData.startTime.split(":");
    const combinedDate = new Date(formData.startDate);
    combinedDate.setHours(parseInt(hours), parseInt(minutes));
    return combinedDate > new Date();
  };

  const isFormValid = 
    formData.name.trim() !== "" &&
    formData.description.trim() !== "" &&
    isContributionValid() &&
    formData.frequency.trim() !== "" &&
    getFrequencyValue() > 0 &&
    formData.maxMembers.trim() !== "" &&
    getMaxMembersValue() > 0 &&
    formData.startDate.trim() !== "" &&
    formData.startTime.trim() !== "" &&
    isStartDateTimeInFuture();

  const createChama = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a chama");
      return;
    }
    if (!isContributionValid()) {
      Alert.alert("Error", `Minimum contribution is ${isKESMode ? MINIMUM_KES + ' KES' : getMinimumUsdc().toFixed(2) + ' USDC'}`);
      return;
    }

    setLoading(true);
    let didSucceed = false;

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      
      const response = await registerChamaToDatabase(
        {
          name: formData.name,
          description: formData.description,
          type: "Private", 
          adminTerms: "[]",
          amount: getContributionValue().toString(),
          cycleTime: getFrequencyValue(),
          maxNo: getMaxMembersValue(),
          startDate: startDateTime,
          collateralRequired: false,
        },
        token
      );

      if (!response.success) {
        Alert.alert("Error", response.error || "Failed to register chama");
        return;
      }

      didSucceed = true;
      Keyboard.dismiss();
      ToastAndroid.show("Chama created successfully", ToastAndroid.SHORT);
      
      router.push("/(tabs)");
      
      requestAnimationFrame(() => {
        queryClient.invalidateQueries({ queryKey: ["userChamas"] });
      });
      
    } catch (error: any) {
      Alert.alert("Error: Unable to create chama.");
    } finally {
      if (!didSucceed) {
        setLoading(false);
      }
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
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
  };
  
  const formatNumberWithCommas = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        updateFormData("startDate", selectedDate.toISOString().slice(0, 10));
        setSelectedDate(selectedDate);
      }
    } else if (selectedDate) {
      updateFormData("startDate", selectedDate.toISOString().slice(0, 10));
      setSelectedDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        updateFormData("startTime", selectedTime.toTimeString().slice(0, 5));
      }
    } else if (selectedTime) {
      updateFormData("startTime", selectedTime.toTimeString().slice(0, 5));
    }
  };

  const CustomDropdown = ({ placeholder, value, options, show, onToggle, onSelect }: any) => (
    <View className="relative z-50">
      <TouchableOpacity
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
        onPress={onToggle}
      >
        <Text className={`font-medium ${value ? "text-gray-900" : "text-gray-500"}`}>{value || placeholder}</Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>
      {show && (
        <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-2 z-50 max-h-48 shadow-lg">
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {options.map((option: any, index: number) => (
              <TouchableOpacity
                key={index}
                className="px-4 py-3 border-b border-gray-100"
                onPress={() => { onSelect(option); onToggle(); }}
              >
                <Text className="text-gray-900 font-medium">{option} {option === 1 ? "member" : "members"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      <View className="bg-downy-800 rounded-b-3xl" style={{ paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-white">Create Chama</Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
      >
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 py-6 gap-6">
            
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Basic Information</Text>
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Chama Name <Text className="text-red-500">*</Text></Text>
                  <TextInput
                    placeholder="e.g., Tech Professionals Savings Group"
                    value={formData.name}
                    onChangeText={(text) => updateFormData("name", text)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  />
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Description <Text className="text-red-500">*</Text></Text>
                  <TextInput
                    placeholder="Describe the purpose and goals of your chama..."
                    value={formData.description}
                    onChangeText={(text) => updateFormData("description", text)}
                    multiline
                    numberOfLines={4}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24"
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</Text>
              <View className="gap-4">
                <View className="flex-row gap-4 z-50">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Maximum Members <Text className="text-red-500">*</Text></Text>
                    <CustomDropdown
                      placeholder="Select members"
                      value={formData.maxMembers ? `${formData.maxMembers} members` : ""}
                      options={memberOptions}
                      show={showMembersDropdown}
                      onToggle={() => setShowMembersDropdown(!showMembersDropdown)}
                      onSelect={(val: any) => updateFormData("maxMembers", val.toString())}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Frequency (days) <Text className="text-red-500">*</Text></Text>
                    <TextInput
                      placeholder="e.g., 7 or 30"
                      value={formData.frequency}
                      onChangeText={(t) => { if (t === "" || /^\d+$/.test(t)) updateFormData("frequency", t); }}
                      keyboardType="numeric"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    />
                  </View>
                </View>

                <View className="flex-row gap-4 mt-2">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-2">First Payout Date <Text className="text-red-500">*</Text></Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between">
                      <Text className={`font-medium ${formData.startDate ? "text-gray-900" : "text-gray-500"}`}>{formatDate(formData.startDate)}</Text>
                      <Calendar size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-2">First Payout Time <Text className="text-red-500">*</Text></Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between">
                      <Text className={`font-medium ${formData.startTime ? "text-gray-900" : "text-gray-500"}`}>{formatTime(formData.startTime)}</Text>
                      <Clock size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {!isStartDateTimeInFuture() && !!(formData.startDate && formData.startTime) && (
                  <Text className="text-red-600 text-xs">First payout date/time must be in the future</Text>
                )}

                <View className="mt-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-medium text-gray-700">Contribution Amount ({isKESMode ? "KES" : "USDC"}) <Text className="text-red-500">*</Text></Text>
                    {user?.location === "KE" && (
                      <TouchableOpacity onPress={() => setIsKESMode(!isKESMode)} className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <Text className="text-emerald-700 text-[10px] font-bold">Switch to {isKESMode ? "USDC" : "KES"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    placeholder={isKESMode ? "e.g., 500 Kes" : "e.g., 5 USDC"}
                    value={isKESMode ? formData.contributionKES : formData.contribution}
                    onChangeText={isKESMode ? handleContributionKESChange : handleContributionUSDCChange}
                    keyboardType="decimal-pad"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  />
                  {!isContributionValid() && hasContributionInput() && (
                    <Text className="text-red-600 text-xs mt-1">Minimum contribution is {isKESMode ? `${MINIMUM_KES} KES` : `${getMinimumUsdc().toFixed(2)} USDC`}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Financial Summary */}
            {!!(formData.contribution && formData.maxMembers && formData.frequency && formData.startDate && formData.startTime) && (
              <View className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mt-2">
                <Text className="text-blue-900 font-bold mb-3 text-base">Financial Summary</Text>
                
                <View className="mb-2">
                  <Text className="text-blue-800 text-sm mb-1">• <Text className="font-semibold">First Payout:</Text> {formatDate(formData.startDate)} at {formatTime(formData.startTime)}</Text>
                  <Text className="text-blue-800 text-sm mb-1">• <Text className="font-semibold">Payout Frequency:</Text> Every {formData.frequency} days</Text>
                  <Text className="text-blue-800 text-sm mb-1">• <Text className="font-semibold">Pool Size:</Text> {isKESMode ? 
                    `${formatNumberWithCommas(parseFloat(formData.contributionKES || "0") * getMaxMembersValue())} KES` : 
                    `${(getContributionValue() * getMaxMembersValue()).toFixed(2)} USDC`
                  } per cycle</Text>
                </View>

                <View className="bg-blue-100/50 p-3 rounded-xl mt-2 border border-blue-200/60">
                  <Text className="text-blue-900 text-[13px] leading-5">
                    <Text className="font-bold text-red-600">Important:</Text> The first payout will happen on <Text className="font-bold">{formatDate(formData.startDate)}</Text>. Before this date, everyone in the chama must have successfully made their contribution. The chama requires at least 2 members to function.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={createChama}
              disabled={!isFormValid || loading}
              className={`py-4 rounded-xl items-center justify-center mt-2 ${isFormValid ? "bg-downy-600 shadow-sm" : "bg-gray-300"}`}
            >
              <Text className="font-semibold text-base text-white">{loading ? "Creating..." : "Create Chama"}</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date/Time Pickers */}
      {Platform.OS === 'android' ? (
        <>
          {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />}
          {showTimePicker && <DateTimePicker value={selectedDate} mode="time" display="default" onChange={handleTimeChange} />}
        </>
      ) : (
        <>
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
              <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowDatePicker(false)} />
              <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, margin: 20, width: "90%" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#111827" }}>Select Date</Text>
                <DateTimePicker value={selectedDate} mode="date" display="compact" onChange={handleDateChange} minimumDate={new Date()} />
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ backgroundColor: "#059669", padding: 14, borderRadius: 12, marginTop: 20, alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <Modal visible={showTimePicker} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
              <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowTimePicker(false)} />
              <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, margin: 20, width: "90%" }}>
                <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#111827" }}>Select Time</Text>
                <DateTimePicker value={selectedDate} mode="time" display="compact" onChange={handleTimeChange} />
                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ backgroundColor: "#059669", padding: 14, borderRadius: 12, marginTop: 20, alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}
