// File: app/(tabs)/withdraw.tsx - Simplified with reusable components
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Smartphone, ChevronDown, Building2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { prepareContractCall, sendTransaction, toUnits, waitForReceipt } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { pretiumSettlementAddress } from "@/constants/contractAddress";
import { chain, client, usdcContract } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import { pretiumOfframp, verifyPhoneNumber } from "@/lib/pretiumService";

// Import reusable components
import CountrySelector from "@/components/CountrySelector";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import BankSelector from "@/components/BankSelector";

// Import utilities
import {
  PRETIUM_COUNTRIES,
  formatPhoneNumber,
  isValidPhoneNumber,
  formatCurrency,
  getProcessingTimeText,
  type Country,
  type PaymentMethod,
  type Bank,
} from "@/Utils/pretiumUtils";

interface Verification {
  success: boolean;
  details: {
    mobile_network: string;
    public_name: string;
    shortcode: string;
    status: string;
  };
}

export default function WithdrawCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<"idle" | "processing" | "completed" | "failed">("idle");

  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(PRETIUM_COUNTRIES[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  // Bank transfer fields
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPhoneData, setVerifiedPhoneData] = useState<Verification | null>(null);
  const [verificationError, setVerificationError] = useState("");

  const { USDCBalance, offramp } = useLocalSearchParams();
  const { token } = useAuth();
  const activeAccount = useActiveAccount();

  const tokens = [{ symbol: "USDC", name: "USD Coin", balance: USDCBalance, image: require("@/assets/images/usdclogo.png") }];

  // Calculations
  const calculateTotalAmount = () => (parseFloat(amount) || 0) * Number(offramp);
  const calculateFee = () => calculateTotalAmount() * 0.005;
  const calculateFinalAmount = () => (calculateTotalAmount() - calculateFee()).toFixed(2);

  // Event handlers
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
    setSelectedMethod(null);
    setSelectedBank(null);
    setPhoneNumber("");
    setAccountNumber("");
    setAccountName("");
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setShowMethodModal(false);
    if (method.type !== 'bank') {
      setSelectedBank(null);
      setAccountNumber("");
      setAccountName("");
    }
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setShowBankModal(false);
  };

  const handleVerifyPhoneNumber = async () => {
    setIsVerifying(true);
    setVerificationError("");
    try {
      const result = await verifyPhoneNumber(`0${phoneNumber}`);
      if (result.success) {
        setVerifiedPhoneData(result);
        setVerificationError("");
      } else {
        setVerificationError(result.error || "Failed to verify phone number");
        setVerifiedPhoneData(null);
      }
    } catch (error) {
      setVerificationError("An error occurred during verification");
      setVerifiedPhoneData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const transferUSDC = async (amount: string, receivingAddress: `0x${string}`) => {
    if (!activeAccount) {
      Alert.alert("Error", "Please connect your wallet");
      return;
    }
    try {
      const transaction = prepareContractCall({
        contract: usdcContract,
        method: "function transfer(address to, uint256 amount)",
        params: [receivingAddress, toUnits(amount, 6)],
      });
      const { transactionHash } = await sendTransaction({ account: activeAccount, transaction });
      const receipt = await waitForReceipt({ client, chain, transactionHash });
      return receipt?.transactionHash;
    } catch (error) {
      console.log("Transfer error:", error);
      return null;
    }
  };

  const handleInitialWithdraw = async () => {
    if (!amount.trim()) return Alert.alert("Error", "Please enter an amount");
    if (!selectedMethod) return Alert.alert("Error", "Please select a payment method");
    if (selectedMethod.type === 'mobile_money') {
      if (!isValidPhoneNumber(phoneNumber)) return Alert.alert("Error", "Please enter a valid phone number");
      setShowVerificationModal(true);
      handleVerifyPhoneNumber();
    } else {
      if (!selectedBank) return Alert.alert("Error", "Please select a bank");
      if (!accountNumber.trim()) return Alert.alert("Error", "Please enter your account number");
      if (!accountName.trim()) return Alert.alert("Error", "Please enter your account name");
      setShowVerificationModal(true);
    }
  };

  const handleConfirmedWithdraw = async () => {
    if (!token || !activeAccount) throw new Error("No token or wallet connected");
    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");
    try {
      const txHash = await transferUSDC(amount, pretiumSettlementAddress);
      if (!txHash) throw new Error("Unable to send USDC");
      let offrampResult;
      if (selectedMethod?.type === 'mobile_money') {
        offrampResult = await pretiumOfframp(`0${phoneNumber}`, parseFloat(calculateFinalAmount()), Number(offramp), amount, txHash, calculateFee(), token);
      } else {
        offrampResult = { success: true }; // TODO: Implement bank API
      }
      if (offrampResult.success) {
        setProcessingStep("completed");
        setTimeout(() => {
          setIsProcessing(false);
          const recipient = selectedMethod?.type === 'mobile_money' ? formatPhoneNumber(selectedCountry.phoneCode, phoneNumber) : selectedBank?.name;
          Alert.alert("Success!", `${selectedCountry.currency} ${calculateFinalAmount()} sent to ${recipient}`, [{ text: "OK", onPress: () => router.push("/wallet") }]);
        }, 2000);
      } else {
        throw new Error(offrampResult.error || "Failed");
      }
    } catch (error) {
      setProcessingStep("failed");
      setTimeout(() => {
        setIsProcessing(false);
        Alert.alert("Error", "Failed to process withdrawal");
      }, 2000);
    }
  };

  const currentToken = tokens[0];
  const totalAmount = calculateTotalAmount().toFixed(2);
  const fee = calculateFee().toFixed(2);
  const finalAmount = calculateFinalAmount();

  const isFormValid = () => {
    const basic = amount.trim() && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(currentToken.balance.toString()) && selectedMethod;
    if (selectedMethod?.type === 'mobile_money') return basic && isValidPhoneNumber(phoneNumber);
    if (selectedMethod?.type === 'bank') return basic && selectedBank && accountNumber.trim() && accountName.trim();
    return basic;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-downy-800 rounded-b-3xl" style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20 }}>
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => router.push("/wallet")} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center" activeOpacity={0.7}>
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Withdraw</Text>
          <View className="w-10" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">Convert crypto to mobile money or bank</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="flex-1">
          <View className="px-6 py-6 gap-5">
            {/* Country Selection */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(true)} className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50" activeOpacity={0.7}>
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-gray-200">
                    <Text className="text-2xl">{selectedCountry.flag}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{selectedCountry.name}</Text>
                    <Text className="text-xs text-gray-600 mt-0.5">Currency: {selectedCountry.currency}</Text>
                  </View>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Payment Method Selection */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">Withdrawal Method</Text>
              {selectedMethod ? (
                <TouchableOpacity onPress={() => setShowMethodModal(true)} className="flex-row items-center justify-between p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50" activeOpacity={0.7}>
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-emerald-200">
                      {selectedMethod.type === 'mobile_money' ? <Smartphone size={22} color="#10b981" /> : <Building2 size={22} color="#10b981" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">{selectedMethod.name}</Text>
                      <Text className="text-xs text-gray-600 mt-0.5">{selectedMethod.type === 'mobile_money' ? 'Instant' : '1-3 business days'} • {selectedCountry.currency}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                    <ChevronDown size={18} color="#10b981" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowMethodModal(true)} className="flex-row items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50" activeOpacity={0.7}>
                  <Text className="text-gray-500 font-medium">Tap to select payment method</Text>
                  <ChevronDown size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Mobile Money Number Input */}
            {selectedMethod?.type === 'mobile_money' && (
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-2">Mobile Money Number</Text>
                <Text className="text-sm text-gray-500 mb-3">Enter your {selectedMethod.name} registered number</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                  <Text className="text-base font-semibold text-gray-700 mr-2">+{selectedCountry.phoneCode}</Text>
                  <TextInput value={phoneNumber} onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 12))} placeholder="712345678" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={12} style={{ fontSize: 16, padding: 0, margin: 0 }} className="flex-1" />
                </View>
              </View>
            )}

            {/* Bank Transfer Details */}
            {selectedMethod?.type === 'bank' && (
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm gap-4">
                <Text className="text-base font-bold text-gray-900">Bank Transfer Details</Text>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Select Bank</Text>
                  {selectedBank ? (
                    <TouchableOpacity onPress={() => setShowBankModal(true)} className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50" activeOpacity={0.7}>
                      <Text className="text-base font-semibold text-gray-900">{selectedBank.name}</Text>
                      <ChevronDown size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setShowBankModal(true)} className="flex-row items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50" activeOpacity={0.7}>
                      <Text className="text-gray-500">Choose your bank</Text>
                      <ChevronDown size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Account Number</Text>
                  <TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Enter your account number" placeholderTextColor="#9CA3AF" keyboardType="numeric" className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-base text-gray-900" />
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Account Name</Text>
                  <TextInput value={accountName} onChangeText={setAccountName} placeholder="As registered with bank" placeholderTextColor="#9CA3AF" className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-base text-gray-900" />
                </View>
              </View>
            )}

            {/* Amount Input Section */}
            {selectedMethod && (
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-4">Withdrawal Amount</Text>
                <View className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50">
                  <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" className="text-center text-4xl font-bold text-gray-900" />
                  <Text className="text-center text-xs font-medium text-gray-500 mt-2">USDC</Text>
                </View>
                <View className="flex-row items-center justify-between mt-4">
                  <Text className="text-sm text-gray-600">Available: <Text className="font-semibold">{currentToken.balance} USDC</Text></Text>
                  <TouchableOpacity onPress={() => setAmount(currentToken.balance.toString())} className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300" activeOpacity={0.7}>
                    <Text className="text-downy-700 text-xs font-bold">Max</Text>
                  </TouchableOpacity>
                </View>
                {parseFloat(amount) > 0 && (
                  <>
                    <View className="my-5"><View className="flex-1 h-px bg-gray-200" /></View>
                    <View className="mb-4 flex-row justify-between items-center">
                      <Text className="text-sm font-semibold text-emerald-800">Exchange Rate</Text>
                      <Text className="text-sm font-bold text-emerald-700">1 USDC = {offramp} {selectedCountry.currency}</Text>
                    </View>
                    <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600">{amount} USDC converts to</Text>
                        <Text className="text-sm font-semibold text-gray-900">{selectedCountry.currency} {formatCurrency(totalAmount)}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-sm text-gray-600">Service Fee (0.5%)</Text>
                        <Text className="text-sm font-semibold text-amber-600">- {selectedCountry.currency} {formatCurrency(fee)}</Text>
                      </View>
                    </View>
                    <View className="mt-4 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                      <Text className="text-xs text-blue-600 font-semibold mb-2 text-center">YOU'LL RECEIVE</Text>
                      <Text className="text-3xl font-bold text-blue-600 text-center">{selectedCountry.currency} {formatCurrency(finalAmount)}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Submit Button */}
            {selectedMethod && (
              <>
                <TouchableOpacity onPress={handleInitialWithdraw} disabled={!isFormValid()} className={`w-full py-4 rounded-2xl shadow-lg ${isFormValid() ? "bg-downy-600" : "bg-gray-300"}`} activeOpacity={0.8}>
                  <Text className={`text-center font-bold text-lg ${isFormValid() ? "text-white" : "text-gray-500"}`}>{selectedMethod.type === 'mobile_money' ? 'Withdraw to Mobile Money' : 'Withdraw to Bank'}</Text>
                </TouchableOpacity>
                <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <Text className="text-xs text-blue-800 text-center">💡 {getProcessingTimeText(selectedMethod.type)}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reusable Modal Components */}
      <CountrySelector
        visible={showCountryModal}
        selectedCountry={selectedCountry}
        onSelect={handleCountrySelect}
        onClose={() => setShowCountryModal(false)}
      />

      <PaymentMethodSelector
        visible={showMethodModal}
        selectedCountry={selectedCountry}
        selectedMethod={selectedMethod}
        onSelect={handleMethodSelect}
        onClose={() => setShowMethodModal(false)}
      />

      <BankSelector
        visible={showBankModal}
        selectedCountry={selectedCountry}
        selectedBank={selectedBank}
        onSelect={handleBankSelect}
        onClose={() => setShowBankModal(false)}
      />

      {/* Verification Modal - Keep inline as it's specific to withdraw */}
      <Modal visible={showVerificationModal} transparent animationType="slide" onRequestClose={() => setShowVerificationModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full shadow-2xl" style={{ maxWidth: 400 }}>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              {selectedMethod?.type === 'mobile_money' ? 'Verify Phone Number' : 'Confirm Bank Transfer'}
            </Text>
            {/* Add verification modal content here - same as before */}
          </View>
        </View>
      </Modal>

      {/* Processing Modal - Keep inline as it's specific to withdraw */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full shadow-2xl" style={{ maxWidth: 400 }}>
            {processingStep === "processing" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">Processing Withdrawal</Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Sending {selectedCountry.currency} {finalAmount} to {selectedMethod?.type === 'mobile_money' ? formatPhoneNumber(selectedCountry.phoneCode, phoneNumber) : selectedBank?.name}
                </Text>
              </>
            )}
            {processingStep === "completed" && (
              <>
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mx-auto">
                  <Check size={40} color="#059669" strokeWidth={3} />
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-emerald-600">Success!</Text>
                <Text className="text-sm text-gray-600 text-center mt-2">Withdrawal completed successfully</Text>
              </>
            )}
            {processingStep === "failed" && (
              <>
                <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mx-auto">
                  <Text className="text-3xl">✕</Text>
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-red-600">Failed</Text>
                <Text className="text-sm text-gray-600 text-center mt-2">Withdrawal failed. Please try again.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}