import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import { Calendar, Clock, Info, Plus, Shield, Users, X } from "lucide-react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { serverUrl } from "../../constants/serverUrl";
import { useAuth } from "../../contexts/AuthContext";

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
  tags: string[];
  collateralRequired: boolean;
}

const memberOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

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
    frequency: 30, // default to monthly
    duration: 150, // calculated automatically
    startDate: new Date().toISOString().slice(0, 10), // Default to today
    startTime: new Date().toTimeString().slice(0, 5), // Default to current time
    tags: [],
    collateralRequired: false, // Will be set automatically based on isPublic
  });
  const [newTag, setNewTag] = useState("");

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dropdown states
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);

  // Calculate duration automatically when frequency or maxMembers changes
  useEffect(() => {
    const calculatedDuration = formData.frequency * formData.maxMembers;
    setFormData(prev => ({ ...prev, duration: calculatedDuration }));
  }, [formData.frequency, formData.maxMembers]);

  // Automatically set collateralRequired based on isPublic
  useEffect(() => {
    setFormData(prev => ({ ...prev, collateralRequired: formData.isPublic }));
  }, [formData.isPublic]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData(
      "tags",
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const dateString = selectedDate.toISOString().slice(0, 10);
      updateFormData("startDate", dateString);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      updateFormData("startTime", timeString);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const createChama = async () => {
    if (!user || !token) {
      Alert.alert("Error", "Please log in to create a chama");
      return;
    }

    setLoading(true);
    try {
      // Combine start date and time into ISO string
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`).toISOString();

      const response = await fetch(`${serverUrl}/chama/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chamaData: {
            name: formData.name,
            description: formData.description,
            type: formData.isPublic ? "Public" : "Private",
            tags: formData.tags.length > 0 ? formData.tags.join(', ') : null,
            amount: formData.contribution.toString(),
            cycleTime: formData.frequency,
            maxNo: formData.maxMembers,
            startDate: startDateTime,
            blockchainId: "1", // Default blockchain ID
            promoCode: "", // Will be generated on backend
            txHash: null
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Chama created successfully!", [
          { text: "OK", onPress: () => router.push("/(tabs)") },
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to create chama");
      }
    } catch (error) {
      console.error("Error creating chama:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      createChama();
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
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Chama Name
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
          Description
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

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Tags</Text>
        <View className="flex-row gap-2 mb-2">
          <TextInput
            placeholder="Add a tag..."
            value={newTag}
            onChangeText={setNewTag}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            onPress={addTag}
            className="bg-emerald-600 p-3 rounded-lg"
          >
            <Plus size={20} className="text-white" />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {formData.tags.map((tag, index) => (
            <View
              key={index}
              className="bg-emerald-100 border border-emerald-200 rounded-full px-3 py-1 flex-row items-center gap-2"
            >
              <Text className="text-emerald-800 text-sm">{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <X size={14} className="text-emerald-600" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
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
            Frequency (days)
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
            Start Date
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedDate(new Date(formData.startDate));
              setShowDatePicker(true);
              setPickerMode('date');
            }}
            className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 flex-row items-center justify-between"
          >
            <Text className="text-gray-900">
              {formatDate(formData.startDate)}
            </Text>
            <Calendar size={20} className="text-gray-400" />
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Start Time
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedDate(new Date(`${formData.startDate} ${formData.startTime}`));
              setShowTimePicker(true);
              setPickerMode('time');
            }}
            className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 flex-row items-center justify-between"
          >
            <Text className="text-gray-900">
              {formatTime(formData.startTime)}
            </Text>
            <Clock size={20} className="text-gray-400" />
          </TouchableOpacity>
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
            Frequency ({formData.frequency} days) × Members ({formData.maxMembers})
          </Text>
        </View>
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Contribution Amount (cUSD)
        </Text>
        <TextInput
          placeholder="5"
          value={formData.contribution.toString()}
          onChangeText={(text) =>
            updateFormData("contribution", parseFloat(text) || 0)
          }
          keyboardType="numeric"
          className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
          placeholderTextColor="#9ca3af"
        />
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
              {(formData.contribution * formData.maxMembers).toLocaleString()}
              {"\n"}• Total contributions: cUSD{" "}
              {(formData.contribution * formData.maxMembers).toLocaleString()}
              {"\n"}• Duration: {formData.duration} days
              {"\n"}• Frequency: {formData.frequency} days
              {"\n"}• Start: {formData.startDate} at {formData.startTime}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View className="gap-4">
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

      <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg">
        <View className="flex-row items-center gap-3 flex-1">
          <Shield size={20} className="text-gray-600" />
          <View className="flex-1">
            <Text className="font-medium text-gray-900">Collateral Required</Text>
            <Text className="text-sm text-gray-600">
              {formData.collateralRequired
                ? "Members must provide collateral (Auto-enabled for Public chamas)"
                : "No collateral required (Auto-disabled for Private chamas)"}
            </Text>
          </View>
        </View>
        <Switch
          value={formData.collateralRequired}
          onValueChange={(value) => updateFormData("collateralRequired", value)}
          trackColor={{ false: "#d1d5db", true: "#10b981" }}
          thumbColor={formData.collateralRequired ? "#ffffff" : "#ffffff"}
          disabled={true} // Disable manual switching since it's automatic
        />
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
            • Duration: {formData.duration} days
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Start: {formatDate(formData.startDate)} at {formatTime(formData.startTime)}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Type: {formData.isPublic ? "Public" : "Private"}
          </Text>
          <Text className="text-emerald-800 text-sm">
            • Collateral: {formData.collateralRequired ? "Required" : "Not Required"}
          </Text>
        </View>
      </View>
    </View>
  );

  const isStep1Valid = formData.name && formData.description;
  const isStep2Valid = formData.contribution && formData.contribution > 0 && 
                      formData.frequency && formData.frequency > 0 &&
                      formData.startDate && formData.startTime;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-xl font-semibold text-gray-900">
                Create Chama
              </Text>
              <Text className="text-sm text-gray-600">Step {step} of 3</Text>
            </View>
          </View>

          {/* Progress */}
          <View className="flex-row gap-2">
            {[1, 2, 3].map((stepNumber) => (
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
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-xl border border-gray-200 p-6">
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                {step === 1 && "Basic Information"}
                {step === 2 && "Financial Settings"}
                {step === 3 && "Privacy & Review"}
              </Text>
              <Text className="text-sm text-gray-600">
                {step === 1 && "Tell us about your chama and its purpose"}
                {step === 2 && "Set up contribution amounts and schedule"}
                {step === 3 && "Choose privacy settings and review details"}
              </Text>
            </View>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>
        </ScrollView>

        {/* Navigation */}
        <View className="bg-white border-t border-gray-200 p-4">
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
                (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || loading
                  ? "bg-gray-300"
                  : "bg-emerald-600 active:bg-emerald-700"
              }`}
              disabled={
                (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || loading
              }
            >
              <Text className="text-white font-medium">
                {loading ? "Creating..." : step === 3 ? "Create Chama" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date/Time Pickers */}
      <Modal
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowDatePicker(false)}
        >
          <DateTimePicker
            value={selectedDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
          />
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowTimePicker(false)}
        >
          <DateTimePicker
            value={selectedDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
