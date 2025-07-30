import { useRouter } from "expo-router";
import { Info, Plus, Shield, Users, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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

interface FormData {
  name: string;
  description: string;
  isPublic: boolean;
  maxMembers: number;
  contribution: number;
  frequency: string;
  duration: number;
  category: string;
  tags: string[];
  collateralRequired: boolean;
}

const categories = [
  { label: "Select a category", value: "" },
  { label: "Professional", value: "professional" },
  { label: "Business", value: "business" },
  { label: "Career Development", value: "career" },
  { label: "Health & Wellness", value: "health" },
  { label: "Education", value: "education" },
  { label: "Community", value: "community" },
];

const memberOptions = [5, 8, 10, 12, 15, 20];
const durationOptions = [6, 8, 10, 12, 15, 20];
const frequencyOptions = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
];

export default function CreateChama() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isPublic: false,
    maxMembers: 10,
    contribution: 5000,
    frequency: "monthly",
    duration: 12,
    category: "",
    tags: [],
    collateralRequired: true,
  });
  const [newTag, setNewTag] = useState("");

  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);

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

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Create chama logic here
      Alert.alert("Success", "Chama created successfully!", [
        { text: "OK", onPress: () => router.push("/(tabs)") }, // TODO: Push to the created chama screen
      ]);
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
        <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
        <CustomDropdown
          placeholder="Select a category"
          value={
            categories.find((c) => c.value === formData.category)?.label || ""
          }
          options={categories.filter((c) => c.value !== "")}
          show={showCategoryDropdown}
          onToggle={() => setShowCategoryDropdown(!showCategoryDropdown)}
          onSelect={(value) => updateFormData("category", value)}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Tags</Text>
        <View className="flex-row gap-2 mb-2">
          <TextInput
            placeholder="Add relevant tags..."
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            onPress={addTag}
            className="bg-gray-200 border border-gray-300 rounded-lg px-3 py-3 items-center justify-center"
          >
            <Plus size={16} className="text-gray-700" />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {formData.tags.map((tag, index) => (
            <View
              key={index}
              className="bg-gray-200 px-3 py-1 rounded-full flex-row items-center gap-1"
            >
              <Text className="text-gray-700 text-sm">{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <X size={12} className="text-gray-500" />
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
            Duration (months)
          </Text>
          <CustomDropdown
            placeholder="Select duration"
            value={`${formData.duration} months`}
            options={durationOptions}
            show={showDurationDropdown}
            onToggle={() => setShowDurationDropdown(!showDurationDropdown)}
            onSelect={(value) => updateFormData("duration", value)}
          />
        </View>
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Monthly Contribution (KES)
        </Text>
        <TextInput
          placeholder="5000"
          value={formData.contribution.toString()}
          onChangeText={(text) =>
            updateFormData("contribution", parseInt(text) || 0)
          }
          keyboardType="numeric"
          className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Contribution Frequency
        </Text>
        <CustomDropdown
          placeholder="Select frequency"
          value={
            frequencyOptions.find((f) => f.value === formData.frequency)
              ?.label || ""
          }
          options={frequencyOptions}
          show={showFrequencyDropdown}
          onToggle={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
          onSelect={(value) => updateFormData("frequency", value)}
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
              • Total pool per payout: KES{" "}
              {(formData.contribution * formData.maxMembers).toLocaleString()}
              {"\n"}• Total contributions: KES{" "}
              {(formData.contribution * formData.duration).toLocaleString()}
              {"\n"}• Expected ROI:{" "}
              {(
                ((formData.maxMembers - 1) / formData.maxMembers) *
                100
              ).toFixed(1)}
              %
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
          trackColor={{ false: "#f3f4f6", true: "#10b981" }}
          thumbColor={formData.isPublic ? "#ffffff" : "#ffffff"}
        />
      </View>

      {formData.isPublic && (
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <View className="flex-row items-start gap-3">
            <Shield size={20} className="text-yellow-600 flex-shrink-0" />
            <View className="flex-1">
              <Text className="text-yellow-900 font-medium mb-1">
                Public Chama Requirements
              </Text>
              <Text className="text-yellow-800 text-sm mb-2">
                Members must lock collateral equal to their contribution amount
                for security.
              </Text>
              <View className="flex-row items-center gap-2">
                <Switch
                  value={formData.collateralRequired}
                  onValueChange={(value) =>
                    updateFormData("collateralRequired", value)
                  }
                  disabled={formData.isPublic}
                  trackColor={{ false: "#f3f4f6", true: "#10b981" }}
                  thumbColor={
                    formData.collateralRequired ? "#ffffff" : "#ffffff"
                  }
                />
                <Text className="text-yellow-800 text-sm flex-1">
                  Require collateral (KES{" "}
                  {formData.contribution.toLocaleString()})
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="bg-white border border-gray-200 rounded-lg p-4">
        <Text className="font-medium text-gray-900 mb-3">Chama Summary</Text>
        <View className="gap-2">
          {[
            ["Name:", formData.name || "Unnamed Chama"],
            ["Category:", formData.category || "Uncategorized"],
            ["Type:", formData.isPublic ? "Public" : "Private"],
            ["Members:", formData.maxMembers.toString()],
            [
              "Contribution:",
              `KES ${formData.contribution.toLocaleString()} ${formData.frequency}`,
            ],
            ["Duration:", `${formData.duration} months`],
            ...(formData.isPublic
              ? [
                  [
                    "Collateral:",
                    `KES ${formData.contribution.toLocaleString()}`,
                  ],
                ]
              : []),
          ].map(([label, value], index) => (
            <View key={index} className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">{label}</Text>
              <Text className="text-gray-900 text-sm font-medium">{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const isStep1Valid =
    formData.name && formData.description && formData.category;
  const isStep2Valid = formData.contribution && formData.contribution > 0;

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
                (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)
                  ? "bg-gray-300"
                  : "bg-emerald-600 active:bg-emerald-700"
              }`}
              disabled={
                (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)
              }
            >
              <Text className="text-white font-medium">
                {step === 3 ? "Create Chama" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
