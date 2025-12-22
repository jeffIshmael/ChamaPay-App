import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Smartphone,
  Wallet,
  Info,
} from "lucide-react-native";
import React, { useState } from "react";
import {
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall, toUnits, toWei, waitForReceipt } from "thirdweb";

import { verifyPhoneNumber, pretiumOfframp } from "@/lib/pretiumService";
import { chain, client, usdcContract } from "@/constants/thirdweb";
import { settlementAddress } from "@/constants/contractAddress";
import { useAuth } from "@/Contexts/AuthContext";

interface Verification {
  success: boolean;
  details: {
    mobile_network: string;
    public_name: string;
    shortcode: string;
    status: string; // COMPLETE
  };
}

export default function WithdrawCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<"mpesa" | "crypto">(
    "mpesa"
  );
  const [selectedToken, setSelectedToken] = useState("cUSD");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");

  // New states for verification modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPhoneData, setVerifiedPhoneData] =
    useState<Verification | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const { mutate: sendTx, data: transactionResult } = useSendTransaction();
  const {
    cUSDBalance,
    USDCBalance,
    totalBalance,
    address,
    currencyCode,
    offramp,
  } = useLocalSearchParams();
  const {token, user} = useAuth();

  const tokens = [
    {
      symbol: "cUSD",
      name: "Celo Dollar",
      balance: cUSDBalance,
      image: require("@/assets/images/cusd.jpg"),
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: USDCBalance,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  const withdrawMethods = [
    {
      id: "mpesa",
      title: "M-Pesa",
      subtitle: "Instant • Converted to KES",
      icon: <Smartphone size={22} color="#10b981" />,
      image: require("@/assets/images/mpesa.png"),
    },
    {
      id: "crypto",
      title: "External Wallet",
      subtitle: "Instant • No additional fees",
      icon: <Wallet size={22} color="#3b82f6" />,
    },
  ];

  // Calculate 0.5% fee
  const calculateFee = () => {
    const cryptoAmount = parseFloat(amount) || 0;
    return (cryptoAmount * 0.005).toFixed(4); // 0.5% fee
  };

  // Calculate total amount to be deducted (amount + fee)
  const calculateTotalDeduction = () => {
    const cryptoAmount = parseFloat(amount) || 0;
    const fee = parseFloat(calculateFee());
    return (cryptoAmount + fee).toFixed(4);
  };

  // Calculate KES amount (based on amount entered, not including fee)
  const calculateKESAmount = () => {
    const cryptoAmount = parseFloat(amount) || 0;
    return (cryptoAmount * Number(offramp)).toFixed(2);
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

  // function to send USDC to the offramp address
  const transferUSDC = async (amount: string, receivingAddress: string) => {
    const amountInWei = toUnits(amount, 6);
    try {
      const transaction = prepareContractCall({
        contract: usdcContract,
        method: "function transfer(address to, uint256 value)",
        params: [receivingAddress, amountInWei],
      });
      sendTx(transaction);

      const transactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: transactionResult?.transactionHash!,
      });

      return transactionReceipt.transactionHash;
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

    if (selectedMethod === "mpesa" && phoneNumber.length !== 9) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    if (selectedMethod === "crypto" && !walletAddress.trim()) {
      Alert.alert("Error", "Please enter wallet address");
      return;
    }

    // For crypto withdrawals, proceed directly
    if (selectedMethod === "crypto") {
      handleCryptoWithdraw();
      return;
    }

    // For M-Pesa, show verification modal
    setShowVerificationModal(true);
    // Auto-verify when modal opens
    handleVerifyPhoneNumber();
  };

  // Handle crypto withdrawal (direct to wallet)
  const handleCryptoWithdraw = async () => {
    setIsProcessing(true);
    setProcessingStep("processing");

    try {
      const txHash = await transferUSDC(amount, walletAddress);
      if (!txHash) {
        throw new Error("Unable to send the usdc.");
      }
      setProcessingStep("completed");
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep("idle");
        Alert.alert("Success!", `${amount} ${selectedToken} sent to wallet`, [
          {
            text: "OK",
            onPress: () => router.push("/wallet"),
          },
        ]);
      }, 2000);
    } catch (error) {
      console.log("the error on transfer", error);
      setIsProcessing(false);
      setProcessingStep("idle");
    } finally {
      setIsProcessing(false);
      setProcessingStep("idle");
    }
  };

  // Handle confirmed M-Pesa withdrawal
  const handleConfirmedMPesaWithdraw = async () => {
    if(!token){
      throw new Error("No token, please refresh page.");
    }
    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");

    try {
      // Step 1: Send cUSD to your wallet
      const txHash = await transferUSDC(amount, walletAddress);
      if (!txHash) {
        throw new Error("Unable to send the usdc.");
      }

      // Step 2: Call pretium offramp with the transaction hash
      const fullPhoneNumber = `0${phoneNumber}`;
      const kesAmount = parseFloat(calculateKESAmount());
      const cusdAmountStr = amount; // The amount user wants to receive in KES (before fee)

      const offrampResult = await pretiumOfframp(
        fullPhoneNumber,
        kesAmount,
        Number(offramp),
        cusdAmountStr,
        txHash, 
        token 
      );

      if (offrampResult.success) {
        setProcessingStep("completed");
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep("idle");
          Alert.alert(
            "Success!",
            `KES ${calculateKESAmount()} sent to +254${phoneNumber}`,
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
  const kesAmount = calculateKESAmount();
  const fee = calculateFee();
  const totalDeduction = calculateTotalDeduction();

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
          <Text className="text-2xl font-bold text-white">Withdraw Crypto</Text>
          <View className="w-10" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Convert crypto to mobile money or send to wallet
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
            {/* Select Token */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Select Token
              </Text>
              <TouchableOpacity
                onPress={() => setShowTokenModal(true)}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex-row items-center justify-between"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Image
                    source={currentToken.image}
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">
                      {currentToken.balance} {currentToken.symbol}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {currentToken.name}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={20} color="#059669" />
              </TouchableOpacity>
            </View>

            {/* Withdrawal Method */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Withdrawal Method
              </Text>
              <View className="gap-3">
                {withdrawMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => {
                      setSelectedMethod(method.id as any);
                      setPhoneNumber("");
                      setWalletAddress("");
                      setAmount("");
                    }}
                    className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                      selectedMethod === method.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                          selectedMethod === method.id
                            ? "bg-white border-2 border-emerald-200"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {method.icon}
                      </View>
                      <View className="flex-1">
                        {method.id === "mpesa" ? (
                          <View>
                            <Image
                              source={method.image}
                              className="h-10 w-16"
                            />
                          </View>
                        ) : (
                          <Text className="text-base font-semibold text-gray-900">
                            {method.title}
                          </Text>
                        )}

                        <Text className="text-xs text-gray-600 mt-0.5">
                          {method.subtitle}
                        </Text>
                      </View>
                    </View>
                    {selectedMethod === method.id && (
                      <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                        <Check size={14} color="white" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Destination Details */}
            {selectedMethod === "mpesa" && (
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-2">
                  M-Pesa Phone Number
                </Text>
                <Text className="text-sm text-gray-500 mb-3">
                  Enter your M-Pesa registered number (To receive KES)
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
            )}

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
                    {currentToken.balance} {currentToken.symbol}
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

              {/* Show fee breakdown for M-Pesa */}
              {selectedMethod === "mpesa" && parseFloat(amount) > 0 && (
                <>
                  <View className="my-5 flex-row items-center">
                    <View className="flex-1 h-px bg-gray-200" />
                  </View>

                  {/* Fee Breakdown */}
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600">Amount</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {amount} {selectedToken}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600">Fee (0.5%)</Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        {fee} {selectedToken}
                      </Text>
                    </View>
                    <View className="h-px bg-gray-200 my-2" />
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm font-bold text-gray-900">
                        Total Deducted
                      </Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {totalDeduction} {selectedToken}
                      </Text>
                    </View>
                  </View>

                  <View className="">
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-sm font-semibold text-emerald-800">
                        Exchange Rate
                      </Text>
                      <Text className="text-sm font-bold text-emerald-700">
                        1 {selectedToken} = {offramp} {currencyCode}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-200">
                    <Text className="text-xs text-blue-600 font-semibold mb-2 text-center tracking-wide">
                      YOU'LL RECEIVE
                    </Text>
                    <Text className="text-3xl font-bold text-blue-600 text-center">
                      {currencyCode} {kesAmount}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {selectedMethod === "crypto" && (
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-2">
                  Destination Wallet
                </Text>
                <Text className="text-sm text-gray-500 mb-3">
                  Enter the wallet address to receive {selectedToken}
                </Text>

                <TextInput
                  value={walletAddress}
                  onChangeText={setWalletAddress}
                  placeholder="0x..."
                  className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                  numberOfLines={2}
                />

                <View className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-200 flex-row">
                  <Text className="text-xs text-amber-700 flex-1 leading-4">
                    Double-check the address. Transactions cannot be reversed.
                  </Text>
                </View>
              </View>
            )}

            {/* Withdraw Button */}
            <TouchableOpacity
              onPress={handleInitialWithdraw}
              disabled={
                !amount.trim() ||
                parseFloat(amount) <= 0 ||
                // parseFloat(totalDeduction) >
                //   parseFloat(currentToken.balance.toString()) ||
                (selectedMethod === "mpesa" && phoneNumber.length !== 9) ||
                (selectedMethod === "crypto" && !walletAddress.trim())
              }
              className={`w-full py-4 rounded-2xl shadow-lg ${
                !amount.trim() ||
                parseFloat(amount) <= 0 ||
                parseFloat(totalDeduction) >
                  parseFloat(currentToken.balance.toString()) ||
                (selectedMethod === "mpesa" && phoneNumber.length !== 9) ||
                (selectedMethod === "crypto" && !walletAddress.trim())
                  ? "bg-gray-300"
                  : "bg-downy-600"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center font-bold text-lg ${
                  !amount.trim() ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(totalDeduction) >
                    parseFloat(currentToken.balance.toString()) ||
                  (selectedMethod === "mpesa" && phoneNumber.length !== 9) ||
                  (selectedMethod === "crypto" && !walletAddress.trim())
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                {selectedMethod === "mpesa"
                  ? "Withdraw to M-Pesa"
                  : "Withdraw to Wallet"}
              </Text>
            </TouchableOpacity>

            {/* Info Note */}
            {selectedMethod === "mpesa" && (
              <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <Text className="text-xs text-blue-800 text-center">
                  💡 Funds will be sent to your M-Pesa account instantly
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Token Selection Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 max-h-[60%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Select Token
              </Text>
              <TouchableOpacity
                onPress={() => setShowTokenModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-600 text-xl">×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tokens.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  onPress={() => {
                    setSelectedToken(token.symbol);
                    setShowTokenModal(false);
                  }}
                  className={`flex-row items-center p-4 rounded-xl mb-3 ${
                    selectedToken === token.symbol
                      ? "bg-emerald-50 border-2 border-emerald-500"
                      : "bg-gray-50 border-2 border-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <Image
                    source={token.image}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">
                      {token.symbol}
                    </Text>
                    <Text className="text-sm text-gray-600">{token.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-semibold text-gray-900">
                      {token.balance}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {token.symbol}
                    </Text>
                  </View>
                  {selectedToken === token.symbol && (
                    <View className="ml-3 w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                      <Text className="text-sm text-gray-600">Amount</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {amount} {selectedToken}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Fee (0.5%)</Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        {fee} {selectedToken}
                      </Text>
                    </View>
                    <View className="h-px bg-gray-300 my-1" />
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-bold text-gray-900">
                        Total Deducted
                      </Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {totalDeduction} {selectedToken}
                      </Text>
                    </View>
                    <View className="h-px bg-gray-300 my-1" />
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-bold text-emerald-700">
                        To Receive
                      </Text>
                      <Text className="text-sm font-bold text-emerald-700">
                        KES {kesAmount}
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
                  {selectedMethod === "mpesa"
                    ? `Sending KES ${kesAmount} to +254${phoneNumber}`
                    : `Sending ${amount} ${selectedToken} to wallet`}
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
