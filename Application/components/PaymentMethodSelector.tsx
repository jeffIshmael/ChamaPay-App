// File: components/PaymentMethodSelector.tsx
import {
  getPaymentMethodsForCountry,
  type Country,
  type PaymentMethod,
} from "@/Utils/pretiumUtils";
import { Building2, Check, Smartphone } from "lucide-react-native";
import React from "react";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PaymentMethodSelectorProps {
  visible: boolean;
  selectedCountry: Country;
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
  excludeBankMethods?: boolean; // Filter out bank methods for onramp flows
}

export default function PaymentMethodSelector({
  visible,
  selectedCountry,
  selectedMethod,
  onSelect,
  onClose,
  excludeBankMethods = false,
}: PaymentMethodSelectorProps) {
  let paymentMethods = getPaymentMethodsForCountry(selectedCountry.code);
  
  // Filter out bank methods if excludeBankMethods is true (for onramp/deposit flows)
  if (excludeBankMethods) {
    paymentMethods = paymentMethods.filter((method) => method.type !== "bank");
  }

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
            {paymentMethods.length === 0 ? (
              <View className="p-8 items-center justify-center">
                <Text className="text-base text-gray-500 text-center">
                  No payment methods available for {selectedCountry.name}
                </Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => onSelect(method)}
                className="flex-row items-center justify-between p-4 px-5 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  {/* Icon Container */}
                  {method.type === "mobile_money" && method.logo ? (
                    <View>
                      <Image
                        source={method.logo}
                        className="h-16 w-16 rounded-md mr-4"
                        resizeMode="contain"
                      />
                    </View>
                  ) : method.type === "mobile_money" ? (
                    <View className="w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mr-4">
                      <Smartphone size={24} color="#10b981" />
                    </View>
                  ) : (
                    <View className="w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mr-4">
                      <Building2 size={24} color="#10b981" />
                    </View>
                  )}

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
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
