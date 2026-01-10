// File: components/BankSelector.tsx
import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput } from "react-native";
import { Check, Building2, Search } from "lucide-react-native";
import { getBanksForCountry, type Bank, type Country } from "@/Utils/pretiumUtils";

interface BankSelectorProps {
  visible: boolean;
  selectedCountry: Country;
  selectedBank: Bank | null;
  onSelect: (bank: Bank) => void;
  onClose: () => void;
}

export default function BankSelector({
  visible,
  selectedCountry,
  selectedBank,
  onSelect,
  onClose,
}: BankSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const banks = getBanksForCountry(selectedCountry.code);
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "70%" }}>
          {/* Header */}
          <View className="p-6 border-b border-gray-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold text-gray-900">
                Select Bank
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-600 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <Search size={18} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search banks..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-base"
              />
            </View>
          </View>

          {/* Banks List */}
          <FlatList
            data={filteredBanks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item)}
                className="flex-row items-center justify-between p-5 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-3">
                    <Building2 size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-base font-medium text-gray-900 flex-1">
                    {item.name}
                  </Text>
                </View>
                {selectedBank?.id === item.id && (
                  <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                    <Check size={14} color="white" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="p-8">
                <Text className="text-center text-gray-500">No banks found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}