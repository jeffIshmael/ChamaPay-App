// File: components/CountrySelector.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { PRETIUM_COUNTRIES, type Country } from "@/Utils/pretiumUtils";

interface CountrySelectorProps {
  visible: boolean;
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export default function CountrySelector({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: CountrySelectorProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "80%" }}>
          {/* Header */}
          <View className="p-6 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Select Country
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Country List */}
          <FlatList
            data={PRETIUM_COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item)}
                className="flex-row items-center justify-between p-5 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-3xl mr-3">{item.flag}</Text>
                  <View>
                    <Text className="text-base font-semibold text-gray-900">
                      {item.name}
                    </Text>
                    <Text className="text-sm text-gray-500">{item.currency}</Text>
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