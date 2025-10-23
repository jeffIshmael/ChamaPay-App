import { chamapayContract, cUSDContract } from "@/constants/thirdweb";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  Info,
  Plus,
  Shield,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Custom checkbox component to avoid dependency conflicts
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { useActiveAccount, useActiveWallet, useReadContract } from "thirdweb/react";
import { toWei } from "thirdweb/utils";
import { useAuth } from "../../Contexts/AuthContext";

import { registerChamaToDatabase } from "@/lib/chamaService";
import { chain, client } from "../../constants/thirdweb";

interface FormData {
  name: string;
  description: string;
  isPublic: boolean;
  maxMembers: number;
  contribution: number;
  frequency: number; // in days
  duration: number; // calculated automatically
  startDate: string; // date in YYYY-MM-DD format
  startTime: string; // time in HH:MM format
  adminTerms: string[];
  collateralRequired: boolean;
}

const memberOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// Custom Checkbox Component
const CustomCheckbox = ({ 
  checked, 
  onPress, 
  color = "#10B981" 
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
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isPublic: false,
    maxMembers: 5,
    contribution: 5, // Default to 5 cUSD
    frequency: 7, // default to weekly
    duration: 35, // calculated automatically
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10), // Default to tomorrow
    startTime: new Date().toTimeString().slice(0, 5), // Default to current time
    adminTerms: [],
    collateralRequired: false, // Will be set automatically based on isPublic
  });
  const [newTerm, setNewTerm] = useState("");
  const { data: totalChamas, isLoading } = useReadContract({
    contract: chamapayContract,
    method: "function totalChamas() view returns (uint256)",
  });

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dropdown states
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [showCollateralModal, setShowCollateralModal] = useState(false);
  const [agreedToCollateral, setAgreedToCollateral] = useState(false);
  const wallet = useActiveWallet();
  const activeAccount = useActiveAccount();

  // Calculate duration automatically when frequency or maxMembers changes
  useEffect(() => {
    const calculatedDuration = formData.frequency * formData.maxMembers;
    setFormData((prev) => ({ ...prev, duration: calculatedDuration }));
  }, [formData.frequency, formData.maxMembers]);

  // Automatically set collateralRequired based on isPublic
  useEffect(() => {
    setFormData((prev) => ({ ...prev, collateralRequired: prev.isPublic }));
  }, [formData.isPublic]);

  // log the total chamas when the component mounts
  useEffect(() => {
    console.log("the total chamas", totalChamas);
  }, [totalChamas]);

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
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const dateString = selectedDate.toISOString().slice(0, 10);
      updateFormData("startDate", dateString);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setSelectedDate(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5);
      updateFormData("startTime", timeString);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const createChama = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a chama");
      return;
    }
    if (!activeAccount) {
      Alert.alert("Error", "No active account.");
      return;
    }

    setLoading(true);
    try {
      // Combine start date and time into Date object
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}:00`
      );

      // convert startDateTime to timestamp
      const startDateTimeTimestamp = Math.floor(startDateTime.getTime() / 1000);

      // convert duration to timestamp
      const durationTimestamp = BigInt(
        Math.floor(formData.duration * 24 * 60 * 60)
      );

      // convert contribution to wei
      const contributionInWei = toWei(formData.contribution.toString());

      // user should lock amount to cater for thw whole cycle
      const totalCollateralRequired =
        formData.contribution * formData.maxMembers;
      // convert contribution to wei
      const totalCollateralRequiredInWei = toWei(
        totalCollateralRequired.toString()
      );

      const blockchainId = Number(totalChamas).toString();
      console.log("the total chamas", totalChamas);

      // const data = await response.json();

      // if its public, we need to sign approve tx because the contract will be calling the transferFrom due to the locking
      if (formData.isPublic) {
        const approveTransaction = prepareContractCall({
          contract: cUSDContract,
          method: "function approve(address spender, uint256 amount)",
          params: [chamapayContract.address, totalCollateralRequiredInWei],
        });
        const { transactionHash: approveTransactionHash } =
          await sendTransaction({
            account: activeAccount,
            transaction: approveTransaction,
          });
        const approveTransactionReceipt = await waitForReceipt({
          client: client,
          chain: chain,
          transactionHash: approveTransactionHash,
        });

        console.log("the approve transaction receipt", approveTransactionReceipt);
        if (!approveTransactionReceipt) {
          Alert.alert(
            "Error",
            `Failed. ensure you have ${totalCollateralRequired} cUSD in your wallet.`
          );
          return;
        }
      }

      // registering chama to the blockchain
      const createChamaTransaction = prepareContractCall({
        contract: chamapayContract,
        method:
          "function registerChama(uint _amount, uint _duration, uint _startDate, uint _maxMembers, bool _isPublic )",
        params: [
          contributionInWei,
          durationTimestamp,
          BigInt(startDateTimeTimestamp),
          BigInt(formData.maxMembers),
          formData.isPublic,
        ],
      });

      const { transactionHash: createChamaTransactionHash } =
        await sendTransaction({
          account: activeAccount,
          transaction: createChamaTransaction,
        });

      const transactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: createChamaTransactionHash,
      });
      console.log(
        "the create chama on blockchain transaction hash",
        transactionReceipt.transactionHash
      );
      if (!transactionReceipt) {
        Alert.alert("Error", "Failed to create chama");
        return;
      }

      // registering chama to the database
      const registerChamaToDatabaseResponse = await registerChamaToDatabase(
        {
          name: formData.name,
          description: formData.description,
          type: formData.isPublic ? "Public" : "Private",
          adminTerms: JSON.stringify(formData.adminTerms),
          amount: formData.contribution.toString(),
          cycleTime: formData.frequency,
          maxNo: formData.maxMembers,
          startDate: startDateTime,
          promoCode: "",
          collateralRequired: formData.isPublic,
          blockchainId: blockchainId,
          adminId: user.id,
          txHash: transactionReceipt.transactionHash,
        },
        token
      );
      if (!registerChamaToDatabaseResponse.success) {
        Alert.alert(
          "Error",
          registerChamaToDatabaseResponse.error ||
            "Failed to register chama to database"
        );
        return;
      }

      // depopulate the form data
      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxMembers: 5,
        contribution: 5,
        frequency: 7,
        duration: 35,
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        startTime: new Date().toTimeString().slice(0, 5),
        adminTerms: [],
        collateralRequired: false,
      });
      setStep(1);
      Alert.alert("Success", "Chama created successfully");
      router.push("/(tabs)");
    } catch (error) {
      console.error("Error creating chama:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Check if collateral is required (public chama)
      if (formData.isPublic && formData.collateralRequired) {
        setAgreedToCollateral(false); // Reset agreement state
        setShowCollateralModal(true);
      } else {
        createChama();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
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
        className="bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
        onPress={onToggle}
      >
        <Text className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </Text>
        <Text className="text-gray-400">▼</Text>
      </TouchableOpacity>
      {show && (
        <View className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 z-10 max-h-40">
          <ScrollView>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                className="p-3 border-b border-gray-100"
                onPress={() => {
                  onSelect(typeof option === "object" ? option.value : option);
                  onToggle();
                }}
              >
                <Text className="text-gray-900">
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
    <View className="gap-4">
      {/* Basic Information Card */}
      <View className="mb-2">
        <Text className="text-lg font-semibold text-gray-900">
          Basic Information & Financial Settings
        </Text>
        <Text className="text-sm text-gray-600">
          Tell us about your chama and set up financial details
        </Text>
      </View>
      <View className="bg-white rounded-xl border border-gray-200 p-6">
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
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
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
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 h-24"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Financial Settings Card */}
      <View className="bg-white rounded-xl border border-gray-200 p-6">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Financial Settings
        </Text>
        <View className="gap-4">
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Maximum Members
              </Text>
              <CustomDropdown
                placeholder="Select members"
                value={`${formData.maxMembers} members`}
                options={memberOptions}
                show={showMembersDropdown}
                onToggle={() => setShowMembersDropdown(!showMembersDropdown)}
                onSelect={(value) => updateFormData("maxMembers", value)}
              />
            </View>

            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Frequency (days) <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                placeholder="30"
                value={formData.frequency.toString()}
                onChangeText={(text) =>
                  updateFormData("frequency", parseInt(text) || 0)
                }
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
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
                  setSelectedDate(new Date(formData.startDate));
                  setShowDatePicker(true);
                  setPickerMode("date");
                }}
                className={`bg-gray-50 border rounded-lg p-3 text-gray-900 flex-row items-center justify-between ${
                  !isStartDateTimeInFuture() && formData.startDate.trim() !== ""
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              >
                <Text className="text-gray-900">
                  {formatDate(formData.startDate)}
                </Text>
                <Calendar size={20} className="text-gray-400" />
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
                  const [hours, minutes] = formData.startTime.split(":");
                  const date = new Date(formData.startDate);
                  date.setHours(parseInt(hours), parseInt(minutes));
                  setSelectedDate(date);
                  setShowTimePicker(true);
                  setPickerMode("time");
                }}
                className={`bg-gray-50 border rounded-lg p-3 text-gray-900 flex-row items-center justify-between ${
                  !isStartDateTimeInFuture() && formData.startTime.trim() !== ""
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              >
                <Text className="text-gray-900">
                  {formatTime(formData.startTime)}
                </Text>
                <Clock size={20} className="text-gray-400" />
              </TouchableOpacity>
              {!isStartDateTimeInFuture() &&
                formData.startTime.trim() !== "" && (
                  <Text className="text-red-600 text-xs mt-1">
                    Start time must be in the future
                  </Text>
                )}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Duration (days)
            </Text>
            <View className="bg-gray-100 border border-gray-300 rounded-lg p-3">
              <Text className="text-gray-900 font-medium">
                {formData.duration} days (calculated automatically)
              </Text>
              <Text className="text-gray-600 text-sm">
                Frequency ({formData.frequency} days) × Members (
                {formData.maxMembers})
              </Text>
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Contribution Amount (cUSD) <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              placeholder="5"
              value={formData.contribution.toString()}
              onChangeText={(text) =>
                updateFormData("contribution", parseFloat(text) || 0)
              }
              keyboardType="numeric"
              className={`bg-gray-50 border rounded-lg p-3 text-gray-900 ${
                formData.contribution <= 0 &&
                formData.contribution.toString() !== ""
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholderTextColor="#9ca3af"
            />
            {formData.contribution <= 0 &&
              formData.contribution.toString() !== "" && (
                <Text className="text-red-600 text-xs mt-1">
                  Contribution amount must be greater than 0
                </Text>
              )}
          </View>

          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <View className="flex-row items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0" />
              <View className="flex-1">
                <Text className="text-blue-900 font-medium mb-1">
                  Financial Summary
                </Text>
                <Text className="text-blue-800 text-sm">
                  • Total pool per payout: cUSD{" "}
                  {(
                    formData.contribution * formData.maxMembers
                  ).toLocaleString()}
                  {"\n"}• Total contributions: cUSD{" "}
                  {(
                    formData.contribution * formData.maxMembers
                  ).toLocaleString()}
                  {"\n"}• Duration: {formData.duration} days
                  {"\n"}• Frequency: {formData.frequency} days
                  {"\n"}• Start: {formData.startDate} at {formData.startTime}
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
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="gap-4 bg-white rounded-xl border border-gray-200 p-6">
      <View>
        <Text className="text-lg font-semibold text-gray-900">
          Privacy & Review
        </Text>
        <Text className="text-sm text-gray-600">
          Choose privacy settings and review details
        </Text>
      </View>
      <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg">
        <View className="flex-row items-center gap-3 flex-1">
          <Users size={20} className="text-gray-600" />
          <View className="flex-1">
            <Text className="font-medium text-gray-900">Chama Type</Text>
            <Text className="text-sm text-gray-600">
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
        <View className="p-4 bg-gray-50 rounded-lg">
          <View className="flex-row items-center gap-3 mb-3">
            <Shield size={20} className="text-gray-600" />
            <View className="flex-1">
              <Text className="font-medium text-gray-900">
                Collateral Required
              </Text>
              <Text className="text-sm text-gray-600">
                Members must provide collateral that caters for one cycle.
              </Text>
            </View>
          </View>
        </View>
      )}

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">
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
            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 min-h-[44px]"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={addTerm}
            className="bg-emerald-600 p-3 rounded-lg self-start"
          >
            <Plus size={20} color={"#fff"} />
          </TouchableOpacity>
        </View>
        {formData.adminTerms.length > 0 && (
          <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Requirements ({formData.adminTerms.length})
            </Text>
            <View className="gap-2">
              {formData.adminTerms.map((term, index) => (
                <View key={index} className="flex-row items-start gap-3">
                  <View className="w-5 h-5  flex-shrink-0 items-center justify-center">
                    <Text className="  text-emerald-600 text-xs font-medium">
                      {index + 1}.
                    </Text>
                  </View>
                  <View className="flex-1 flex-row items-center justify-between">
                    <Text className="text-sm text-gray-600 flex-1">{term}</Text>
                    <TouchableOpacity onPress={() => removeTerm(term)}>
                      <X size={14} className="text-gray-400" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <Text className="text-emerald-900 font-medium mb-2">Summary</Text>
        <View className="space-y-1">
          <Text className="text-emerald-800 text-sm">
            • Name: {formData.name}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Members: {formData.maxMembers}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Contribution: cUSD {formData.contribution.toLocaleString()}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Frequency: {formData.frequency} days
          </Text>
          <Text className="text-emerald-800 text-sm">
            • One Cycle Duration: {formData.duration} days
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Start: {formatDate(formData.startDate)} at{" "}
            {formatTime(formData.startTime)}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Type: {formData.isPublic ? "Public" : "Private"}
          </Text>
          {formData.isPublic && (
            <Text className="text-emerald-800 text-sm">
              • Collateral Required: {formData.contribution * formData.maxMembers} cUSD
            </Text>
          )}
          {formData.adminTerms.length > 0 && (
            <>
              <Text className="text-emerald-800 text-sm font-medium mt-2">
                • Requirements:
              </Text>
              {formData.adminTerms.map((term, index) => (
                <Text key={index} className="text-emerald-800 text-sm pl-4">
                  {index + 1}. {term}
                </Text>
              ))}
            </>
          )}
        </View>
      </View>
    </View>
  );

  // Check if start date and time are in the future
  const isStartDateTimeInFuture = () => {
    const now = new Date();
    const startDateTime = new Date(
      `${formData.startDate}T${formData.startTime}:00`
    );
    return startDateTime > now;
  };

  const isStep1Valid =
    formData.name.trim() !== "" &&
    formData.description.trim() !== "" &&
    formData.contribution > 0 &&
    formData.frequency > 0 &&
    formData.startDate.trim() !== "" &&
    formData.startTime.trim() !== "" &&
    isStartDateTimeInFuture();

  // Debug validation
  console.log("Validation check:", {
    name: formData.name,
    description: formData.description,
    contribution: formData.contribution,
    frequency: formData.frequency,
    startDate: formData.startDate,
    startTime: formData.startTime,
    isStartDateTimeInFuture: isStartDateTimeInFuture(),
    isValid: isStep1Valid,
  });

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center gap-4 mb-4">
          <View className="flex-1">
            <Text className="text-xl font-semibold text-gray-900">
              Create Chama
            </Text>
            <Text className="text-sm text-gray-600">Step {step} of 2</Text>
          </View>
        </View>

        {/* Progress */}
        <View className="flex-row gap-2">
          {[1, 2].map((stepNumber) => (
            <View
              key={stepNumber}
              className={`flex-1 h-2 rounded-full ${
                stepNumber <= step ? "bg-emerald-600" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View className="p-4">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </View>

          {/* Navigation */}
          <View className="bg-white border-t border-gray-200 p-4 mx-4 rounded-t-xl">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleBack}
                className={`flex-1 p-4 border border-gray-300 rounded-lg items-center justify-center ${
                  step === 1 ? "opacity-50" : "active:bg-gray-50"
                }`}
                disabled={step === 1}
              >
                <Text className="text-gray-700 font-medium">
                  {step === 1 ? "Cancel" : "Back"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                className={`flex-1 p-4 rounded-lg items-center justify-center ${
                  (step === 1 && !isStep1Valid) || loading
                    ? "bg-gray-300"
                    : "bg-emerald-600 active:bg-emerald-700"
                }`}
                disabled={(step === 1 && !isStep1Valid) || loading}
              >
                <Text
                  className={`font-medium ${
                    (step === 1 && !isStep1Valid) || loading
                      ? "text-gray-500"
                      : "text-white"
                  }`}
                >
                  {loading
                    ? "Creating..."
                    : step === 2
                    ? "Create Chama"
                    : "Next"}
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
              borderRadius: 12,
              padding: 20,
              margin: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
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
                padding: 12,
                borderRadius: 8,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Done</Text>
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
              borderRadius: 12,
              padding: 20,
              margin: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
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
                padding: 12,
                borderRadius: 8,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Done</Text>
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
                For public chamas, members must provide collateral as a security measure
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
                      {(formData.contribution * formData.maxMembers).toLocaleString()} cUSD
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
                    This is a security measure in case a member defaults payment, ensuring the cycle continues without disruption
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
                  color="#10B981"
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
                      {(formData.contribution * formData.maxMembers).toLocaleString()} cUSD
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
                  borderColor: "#D1D5DB",
                  alignItems: "center",
                }}
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
                  backgroundColor: agreedToCollateral ? "#10B981" : "#D1D5DB",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: agreedToCollateral ? "white" : "#9CA3AF",
                  }}
                >
                  I Understand, Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
