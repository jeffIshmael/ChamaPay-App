import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Smartphone } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  prepareContractCall,
  sendTransaction,
  toUnits,
  waitForReceipt,
} from "thirdweb";
import { useActiveAccount } from "thirdweb/react";

import { pretiumSettlementAddress } from "@/constants/contractAddress";
import { chain, client, usdcContract } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import { pretiumOfframp, verifyPhoneNumber } from "@/lib/pretiumService";

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
  const [processingStep, setProcessingStep] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPhoneData, setVerifiedPhoneData] =
    useState<Verification | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const { USDCBalance, totalBalance, address, currencyCode, offramp } =
    useLocalSearchParams();
  const { token, user } = useAuth();
  const activeAccount = useActiveAccount();

  const selectedToken = "USDC"; // Fixed to USDC only

  const tokens = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: USDCBalance,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const calculateTotalKESAmount = () => {
    const cryptoAmount = parseFloat(amount) || 0;
    return cryptoAmount * Number(offramp);
  };

  // Calculate 0.5% fee in KES
  const calculateKESFee = () => {
    const totalKES = calculateTotalKESAmount();
    return totalKES * 0.005; // 0.5% fee
  };

  // Calculate final KES amount user receives (after fee deduction)
  const calculateFinalKESAmount = () => {
    const totalKES = calculateTotalKESAmount();
    const fee = calculateKESFee();
    return (totalKES - fee).toFixed(2);
  };

  // Verify phone number function
  const handleVerifyPhoneNumber = async () => {
    setIsVerifying(true);
    setVerificationError("");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;
      const result = await verifyPhoneNumber(fullPhoneNumber);
      console.log("verification result", result);

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

  // Function to send USDC to the settlement address
  const transferUSDC = async (amount: string, receivingAddress: `0x${string}`) => {
    if (!activeAccount) {
      Alert.alert("Error", "Please connect your wallet");
      return;
    }
    const amountInWei = toUnits(amount, 6);

    try {

      const transferTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function transfer(address to, uint256 amount)",
        params: [receivingAddress, amountInWei],
      });
      const { transactionHash: transferTransactionHash } =
        await sendTransaction({
          account: activeAccount,
          transaction: transferTransaction,
        });
      const transferTransactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: transferTransactionHash,
      });
      if (!transferTransactionReceipt) {
        Alert.alert("Error", "Failed to send transaction");
        return;
      }

      return transferTransactionReceipt.transactionHash;
    } catch (error) {
      console.log("error in the sending token", error);
      return null;
    }
  };

  // Initial withdraw button click - opens verification modal
  const handleInitialWithdraw = async () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }

    if (phoneNumber.length !== 9) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    // Show verification modal
    setShowVerificationModal(true);
    // Auto-verify when modal opens
    handleVerifyPhoneNumber();
  };

  // Handle confirmed M-Pesa withdrawal
  const handleConfirmedMPesaWithdraw = async () => {
    if (!token) {
      throw new Error("No token, please refresh page.");
    }
    if(!activeAccount){
      throw new Error("No wallet connected, please refresh page.");
    }
    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");

    try {
      // Step 1: Send exact USDC amount to settlement address
      const txHash = await transferUSDC(amount, pretiumSettlementAddress);
      if (!txHash) {
        throw new Error("Unable to send the usdc.");
      }

      // Step 2: Call pretium offramp with the transaction hash
      const fullPhoneNumber = `0${phoneNumber}`;
      const finalKesAmount = parseFloat(calculateFinalKESAmount());
      const kesFee = calculateKESFee();

      const offrampResult = await pretiumOfframp(
        fullPhoneNumber,
        finalKesAmount, // Amount user will receive (after fee)
        Number(offramp),
        amount, // Exact USDC amount sent
        txHash,
        kesFee, // Fee in KES that we're taking
        token
      );

      if (offrampResult.success) {
        setProcessingStep("completed");
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep("idle");
          Alert.alert(
            "Success!",
            `KES ${calculateFinalKESAmount()} sent to +254${phoneNumber}`,
            [
              {
                text: "OK",
                onPress: () => router.push("/wallet"),
              },
            ]
          );
        }, 2000);
      } else {
        setProcessingStep("failed");
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep("idle");
          Alert.alert(
            "Error",
            offrampResult.error || "Failed to process withdrawal"
          );
        }, 2000);
      }
    } catch (error) {
      setProcessingStep("failed");
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep("idle");
        Alert.alert("Error", "Failed to process withdrawal");
      }, 2000);
    }
  };

  const currentToken =
    tokens.find((t) => t.symbol === selectedToken) || tokens[0];
  const totalKESAmount = calculateTotalKESAmount().toFixed(2);
  const kesFee = calculateKESFee().toFixed(2);
  const finalKESAmount = calculateFinalKESAmount();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => router.push("/wallet")}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Withdraw to M-Pesa</Text>
          <View className="w-10" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Convert crypto to mobile money (fiat money)
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
        >
          <View className="px-6 py-6 gap-5">
            {/* M-Pesa Method Display */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Withdrawal Method
              </Text>
              <View className="flex-row items-center justify-between p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-emerald-200">
                    <Smartphone size={22} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Image
                      source={require("@/assets/images/mpesa.png")}
                      className="h-10 w-16"
                      resizeMode="contain"
                    />
                    <Text className="text-xs text-gray-600 mt-0.5">
                      Instant • Converted to KES
                    </Text>
                  </View>
                </View>
                <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                  <Check size={14} color="white" strokeWidth={3} />
                </View>
              </View>
            </View>

            {/* M-Pesa Phone Number */}
            <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-2">
              M-Pesa Phone Number
            </Text>
            <Text className="text-sm text-gray-500 mb-3">
              Enter your M-Pesa registered number
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
              <Text className="text-base font-semibold text-gray-700 mr-2">
                +254
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 9);
                  setPhoneNumber(cleaned);
                }}
                placeholder="712345678"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={9}
                style={{ fontSize: 16, padding: 0, margin: 0 }}
                className="flex-1"
              />
            </View>
            <Text className="text-xs text-gray-400 mt-2 ml-1">
              Format: 7XXXXXXXX or 1XXXXXXXX
            </Text>
          </View>

            {/* Amount Input */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Withdrawal Amount
              </Text>

              {/* Amount Input Box */}
              <View className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border-2 border-gray-200">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                  className="text-center text-4xl font-bold text-gray-900"
                />
                <Text className="text-center text-xs font-medium text-gray-500 mt-2 tracking-wide">
                  {currentToken.symbol}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-4">
                <Text className="text-sm text-gray-600">
                  Available:{" "}
                  <Text className="font-semibold">
                    {currentToken.balance} USDC
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setAmount(currentToken.balance.toString())}
                  className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300"
                  activeOpacity={0.7}
                >
                  <Text className="text-downy-700 text-xs font-bold">Max</Text>
                </TouchableOpacity>
              </View>

              {/* Show conversion breakdown */}
              {parseFloat(amount) > 0 && (
                <>
                  <View className="my-5 flex-row items-center">
                    <View className="flex-1 h-px bg-gray-200" />
                  </View>

                  {/* Exchange Rate */}
                  <View className="mb-4">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm font-semibold text-emerald-800">
                        Exchange Rate
                      </Text>
                      <Text className="text-sm font-bold text-emerald-700">
                        1 {selectedToken} = {offramp} {currencyCode}
                      </Text>
                    </View>
                  </View>

                  {/* Conversion Breakdown */}
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600">
                        {amount} USDC converts to
                      </Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {currencyCode} {formatNumberWithCommas(totalKESAmount)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600">
                        Service Fee (0.5%)
                      </Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        - {currencyCode} {formatNumberWithCommas(kesFee)}
                      </Text>
                    </View>
                    {/* <View className="h-px bg-gray-200 my-2" /> */}
                    {/* <View className="flex-row justify-between items-center">
                      <Text className="text-sm font-bold text-gray-900">
                        You Send
                      </Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {formatNumberWithCommas(amount)} USDC
                      </Text>
                    </View> */}
                  </View>

                  {/* Final Amount Highlight */}
                  <View className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border-2 border-blue-200">
                    <Text className="text-xs text-blue-600 font-semibold mb-2 text-center tracking-wide">
                      YOU'LL RECEIVE
                    </Text>
                    <Text className="text-3xl font-bold text-blue-600 text-center">
                      {currencyCode} {formatNumberWithCommas(finalKESAmount)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Withdraw Button */}
            <TouchableOpacity
              onPress={handleInitialWithdraw}
              disabled={
                !amount.trim() ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) >
                  parseFloat(currentToken.balance.toString()) ||
                phoneNumber.length !== 9
              }
              className={`w-full py-4 rounded-2xl shadow-lg ${
                !amount.trim() ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) >
                  parseFloat(currentToken.balance.toString()) ||
                phoneNumber.length !== 9
                  ? "bg-gray-300"
                  : "bg-downy-600"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center font-bold text-lg ${
                  !amount.trim() ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) >
                    parseFloat(currentToken.balance.toString()) ||
                  phoneNumber.length !== 9
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                Withdraw to M-Pesa
              </Text>
            </TouchableOpacity>

            {/* Info Note */}
            <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <Text className="text-xs text-blue-800 text-center">
                💡 Funds will be sent to your M-Pesa account instantly
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Phone Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              Verify Phone Number
            </Text>

            {isVerifying ? (
              <View className="py-8">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-sm text-gray-600 text-center mt-4">
                  Verifying +254{phoneNumber}...
                </Text>
              </View>
            ) : verificationError ? (
              <View className="py-4">
                <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
                  <Text className="text-sm text-red-800 text-center">
                    {verificationError}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleVerifyPhoneNumber}
                  className="bg-downy-600 py-3 rounded-xl mb-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-semibold">
                    Retry Verification
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowVerificationModal(false)}
                  className="bg-gray-200 py-3 rounded-xl"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ) : verifiedPhoneData ? (
              <View className="py-4">
                <View className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mb-4">
                  <View className="flex-row items-center justify-center mb-3"></View>
                  <Text className="text-sm font-semibold text-gray-900 text-center mb-1">
                    Verified Phone Number
                  </Text>
                  <Text className="text-lg font-bold text-emerald-700 text-center mb-3">
                    {verifiedPhoneData.details.shortcode}
                  </Text>
                  {verifiedPhoneData.details.public_name && (
                    <Text className="text-sm text-gray-600 text-center">
                      {verifiedPhoneData.details.public_name}
                    </Text>
                  )}
                </View>

                {/* Transaction Summary */}
                <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                  <Text className="text-sm font-bold text-gray-900 mb-3 text-center">
                    Transaction Summary
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">You Send</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {formatNumberWithCommas(amount)} USDC
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Converts To</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {currencyCode} {formatNumberWithCommas(totalKESAmount)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">
                        Service Fee (0.5%)
                      </Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        - {currencyCode} {formatNumberWithCommas(kesFee)}
                      </Text>
                    </View>
                    <View className="h-px bg-gray-300 my-1" />
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-bold text-emerald-700">
                        You'll Receive
                      </Text>
                      <Text className="text-sm font-bold text-emerald-700">
                        {currencyCode} {formatNumberWithCommas(finalKESAmount)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmedMPesaWithdraw}
                  className="bg-downy-600 py-4 rounded-xl mb-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-bold text-lg">
                    Confirm & Withdraw
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowVerificationModal(false)}
                  className="bg-gray-200 py-3 rounded-xl"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            {processingStep === "processing" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Processing Withdrawal
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Sending {currencyCode} {finalKESAmount} to +254{phoneNumber}
                </Text>
              </>
            )}

            {processingStep === "completed" && (
              <>
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mx-auto">
                  <Check size={40} color="#059669" strokeWidth={3} />
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-emerald-600">
                  Success!
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Withdrawal completed successfully
                </Text>
              </>
            )}

            {processingStep === "failed" && (
              <>
                <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mx-auto">
                  <Text className="text-3xl">✕</Text>
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-red-600">
                  Failed
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Withdrawal failed. Please try again.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
