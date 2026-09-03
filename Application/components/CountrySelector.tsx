// File: components/CountrySelector.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { PHONE_DIAL_COUNTRIES } from "@/Utils/phoneCountries";
import { PRETIUM_COUNTRIES, type Country } from "@/Utils/pretiumUtils";

interface CountrySelectorProps {
  visible: boolean;
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
  /** Show dial code (+254) instead of currency — for phone login */
  variant?: "default" | "phone";
}

export default function CountrySelector({
  visible,
  selectedCountry,
  onSelect,
  onClose,
  variant = "default",
}: CountrySelectorProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center px-5"
        style={{ backgroundColor: "rgba(55, 65, 81, 0.85)" }}
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-3xl overflow-hidden" style={{ maxHeight: "70%" }}>
          <View className="p-5 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              {variant === "phone" ? "Country code" : "Select Country"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              variant === "phone"
                ? PHONE_DIAL_COUNTRIES
                : PRETIUM_COUNTRIES.filter((c) => c.code !== "ROW")
            }
            keyExtractor={(item) => `${item.code}-${item.phoneCode}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-2xl mr-3">{item.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {item.name}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {variant === "phone"
                        ? `+${item.phoneCode}`
                        : item.currency}
                    </Text>
                  </View>
                </View>
                {selectedCountry.code === item.code && (
                  <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                    <Check size={14} color="white" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
