// File: components/PaymentMethodSelector.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Check, Smartphone, Building2 } from "lucide-react-native";
import { getPaymentMethodsForCountry, type PaymentMethod, type Country } from "@/Utils/pretiumUtils";

interface PaymentMethodSelectorProps {
  visible: boolean;
  selectedCountry: Country;
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}

export default function PaymentMethodSelector({
  visible,
  selectedCountry,
  selectedMethod,
  onSelect,
  onClose,
}: PaymentMethodSelectorProps) {
  const paymentMethods = getPaymentMethodsForCountry(selectedCountry.code);

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
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">
                Select Payment Method
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-600 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 mt-1">
              Available in {selectedCountry.name}
            </Text>
          </View>

          {/* Payment Methods List */}
          <ScrollView>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => onSelect(method)}
                className="flex-row items-center justify-between p-5 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  {/* Icon Container */}
                  <View className="w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mr-4">
                    {method.type === "mobile_money" ? (
                      <Smartphone size={24} color="#10b981" />
                    ) : (
                      <Building2 size={24} color="#10b981" />
                    )}
                  </View>

                  {/* Method Info */}
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {method.name}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      {/* <Text className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {method.type === "mobile_money" ? "Instant" : "1-3 days"}
                      </Text> */}
                      <Text className="text-xs text-gray-500 capitalize">
                        {method.type.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Selected Checkmark */}
                {selectedMethod?.id === method.id && (
                  <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                    <Check size={14} color="white" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
