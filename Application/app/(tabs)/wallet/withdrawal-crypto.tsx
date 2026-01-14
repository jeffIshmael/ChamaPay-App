// File: app/(tabs)/withdraw.tsx - Simplified with reusable components
import { pretiumSettlementAddress } from "@/constants/contractAddress";
import { chain, client, usdcContract } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import {
  CurrencyCode,
  getExchangeRate,
  pretiumOfframp,
  validatePhoneNumber,
  validateWithdrawalDetails
} from "@/lib/pretiumService";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Smartphone,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

// Import reusable components
import BankSelector from "@/components/BankSelector";
import CountrySelector from "@/components/CountrySelector";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

// Import utilities
import {
  PRETIUM_COUNTRIES,
  PRETIUM_TRANSACTION_LIMIT,
  formatCurrency,
  formatPhoneNumber,
  isValidPhoneNumber,
  type Bank,
  type Country,
  type PaymentMethod,
  type TransactionLimits,
} from "@/Utils/pretiumUtils";
import { type Quote } from "./index";

type MobileDetailsShape = {
  mobile_network?: string;
  public_name?: string;
  shortcode?: string;
  status?: string;
};

type BankDetailsShape = {
  status?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  bank_code?: string | number;
};

// Normalized mobile validation response for UI display
interface Verification {
  success: boolean;
  MobileDetails?: MobileDetailsShape;
  details?: MobileDetailsShape; // legacy/alt shape support
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

  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    PRETIUM_COUNTRIES[0]
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [limits, setLimits] = useState<TransactionLimits | null>(
    PRETIUM_TRANSACTION_LIMIT[selectedCountry.code] || null
  );
  const [exchangeRate, setExchangeRate] = useState<Quote | null>(null);

  // Bank transfer fields
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPhoneData, setVerifiedPhoneData] =
    useState<Verification | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [bankValidation, setBankValidation] = useState<any | null>(null);

  const getMobileDetails = (v: any): MobileDetailsShape | null =>
    (v?.MobileDetails as MobileDetailsShape) ||
    (v?.details as MobileDetailsShape) ||
    null;

  const getBankDetails = (v: any): BankDetailsShape | null =>
    (v?.BankDetails as BankDetailsShape) ||
    (v?.details as BankDetailsShape) ||
    null;

  const { USDCBalance, offramp } = useLocalSearchParams();
  const { token } = useAuth();
  const activeAccount = useActiveAccount();

  const tokens = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: USDCBalance,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  // Update limits when country changes
  useEffect(() => {
    const countryLimits = PRETIUM_TRANSACTION_LIMIT[selectedCountry.code];
    setLimits(countryLimits || null);
  }, [selectedCountry.code]);

  // Fetch exchange rate when country changes
  useEffect(() => {
    const fetchRate = async () => {
      if (!selectedCountry.currency) return;
      try {
        const rate = await getExchangeRate(
          selectedCountry.currency as CurrencyCode
        );
        if (rate && rate.success) {
          setExchangeRate(rate);
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    };
    fetchRate();
  }, [selectedCountry.currency]);

  // Get current exchange rate (use fetched rate or fallback to param)
  const currentExchangeRate =
    exchangeRate?.exchangeRate?.buying_rate || Number(offramp) || 0;

  // Calculations
  const calculateTotalAmount = () =>
    (parseFloat(amount) || 0) * currentExchangeRate;
  const calculateFee = () => calculateTotalAmount() * 0.005;
  const calculateFinalAmount = () =>
    (calculateTotalAmount() - calculateFee()).toFixed(2);

  // Convert min/max limits from local currency to USDC
  const minUSDC =
    limits && currentExchangeRate > 0
      ? (limits.min / currentExchangeRate).toFixed(2)
      : null;
  const maxUSDC =
    limits && currentExchangeRate > 0
      ? (limits.max / currentExchangeRate).toFixed(2)
      : null;

  // Event handlers
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
    // Clear method selection when switching countries, especially for ROW
    if (country.code === "ROW" || country.code !== selectedCountry.code) {
      setSelectedMethod(null);
      setSelectedBank(null);
      setPhoneNumber("");
      setAccountNumber("");
      setAccountName("");
      setAmount("");
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setShowMethodModal(false);
    if (method.type !== "bank") {
      setSelectedBank(null);
      setAccountNumber("");
      setAccountName("");
    }
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setShowBankModal(false);
  };

  // Verify mobile money details: basic phone lookup + Pretium mobile validation
  const handleVerifyPhoneNumber = async () => {
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Error", "Please select a method");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");
    setVerifiedPhoneData(null);

    try {
      // Ethiopia and Malawi don't support shortcode verification - use user-entered details directly
      if (selectedCountry.code === "ETB" || selectedCountry.code === "MWK" || selectedCountry.code === "CDF") {
        const mockValidation = {
          success: true,
          MobileDetails: {
            mobile_network: selectedMethod.id || selectedMethod.name,
            public_name: formatPhoneNumber(selectedCountry.phoneCode, phoneNumber),
            shortcode: `0${phoneNumber}`,
            status: "COMPLETE",
          },
        };
        setVerifiedPhoneData(mockValidation);
        setVerificationError("");
        setIsVerifying(false);
        return;
      }

      // Then validate the mobile network details with Pretium
      const currencyCode = selectedCountry.currency as CurrencyCode;
      const mobileNetwork = selectedMethod?.id;
      const shortcode = `0${phoneNumber}`;
      console.log("the shortcode", shortcode);
      console.log("the mobilem network", mobileNetwork);

      const validation = await validatePhoneNumber(
        currencyCode,
        "MOBILE",
        mobileNetwork,
        shortcode,
        token
      );
      console.log("The phone number validation", validation);

      if (!validation.success) {
        setVerificationError(
          validation.error || "Failed to validate mobile money details"
        );
      } else {
        const md = getMobileDetails(validation);
        if (!md) {
          setVerificationError(
            "Verification succeeded but details were missing. Please try again."
          );
          return;
        }

        setVerifiedPhoneData(validation);
        setVerificationError("");
      }
    } catch (error) {
      console.error("Error during mobile verification:", error);
      setVerificationError("An error occurred during verification");
      setVerifiedPhoneData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify bank details (KE via PAYBILL, NG via bank validation endpoint)
  const handleVerifyBankDetails = async () => {
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }
    if (!selectedBank) return;

    setIsVerifying(true);
    setVerificationError("");
    setBankValidation(null);

    try {
      // Ethiopia and Malawi don't support bank verification - use user-entered details directly
      if (selectedCountry.code === "ETB" || selectedCountry.code === "MWK") {
        const mockValidation = {
          success: true,
          BankDetails: {
            account_name: accountName || "—",
            account_number: accountNumber,
            bank_name: selectedBank.name,
            bank_code: String(selectedBank.code),
            status: "COMPLETE",
          },
        };
        setBankValidation(mockValidation);
        setVerificationError("");
        setIsVerifying(false);
        return;
      }

      if (selectedCountry.code === "KE") {
        // Kenyan banks are verified as Safaricom PAYBILLs
        const currencyCode = selectedCountry.currency as CurrencyCode;
        const validation = await validatePhoneNumber(
          currencyCode,
          "PAYBILL",
          "Safaricom",
          String(selectedBank.code),
          token,
          accountNumber
        );

        console.log("The kenya bank validation", validation);

        if (!validation.success) {
          setVerificationError(
            validation.error || "Failed to validate bank details"
          );
        } else {
          const md = getMobileDetails(validation);
          if (!md) {
            setVerificationError(
              "Verification succeeded but details were missing. Please try again."
            );
            return;
          }
          setBankValidation(validation);
        }
      } else if (selectedCountry.code === "NG") {
        // Nigerian banks use the withdrawal validation endpoint
        const validation = await validateWithdrawalDetails(
          accountNumber,
          Number(selectedBank.code),
          token
        );
        console.log("The nigeria log validation", validation);

        if (!validation.success) {
          setVerificationError(
            validation.error || "Failed to validate bank details"
          );
        } else {
          const bd = getBankDetails(validation);
          if (!bd) {
            setVerificationError(
              "Verification succeeded but details were missing. Please try again."
            );
            return;
          }
          setBankValidation(validation);
        }
      } else {
        setVerificationError(
          "Bank validation is not yet available for this country."
        );
      }
    } catch (error) {
      console.error("Error during bank verification:", error);
      setVerificationError("An error occurred during bank verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const transferUSDC = async (
    amount: string,
    receivingAddress: `0x${string}`
  ) => {
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
      const { transactionHash } = await sendTransaction({
        account: activeAccount,
        transaction,
      });
      const receipt = await waitForReceipt({ client, chain, transactionHash });
      return receipt?.transactionHash;
    } catch (error) {
      console.log("Transfer error:", error);
      return null;
    }
  };

  const handleInitialWithdraw = async () => {
    if (!amount.trim()) return Alert.alert("Error", "Please enter an amount");

    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(currentToken.balance.toString());

    if (amountNum <= 0) {
      return Alert.alert("Error", "Amount must be greater than 0");
    }

    if (amountNum > balanceNum) {
      return Alert.alert("Error", "Insufficient balance");
    }

    // Validate against min/max limits
    if (limits && currentExchangeRate > 0) {
      const localCurrencyAmount = amountNum * currentExchangeRate;
      if (localCurrencyAmount < limits.min) {
        return Alert.alert(
          "Error",
          `Minimum withdrawal is ${limits.currency} ${formatCurrency(
            limits.min
          )} (${minUSDC} USDC)`
        );
      }
      if (localCurrencyAmount > limits.max) {
        return Alert.alert(
          "Error",
          `Maximum withdrawal is ${limits.currency} ${formatCurrency(
            limits.max
          )} (${maxUSDC} USDC)`
        );
      }
    }

    if (!selectedMethod)
      return Alert.alert("Error", "Please select a payment method");
    if (selectedMethod.type === "mobile_money") {
      if (!isValidPhoneNumber(phoneNumber))
        return Alert.alert("Error", "Please enter a valid phone number");
      setShowVerificationModal(true);
      handleVerifyPhoneNumber();
    } else {
      if (!selectedBank) return Alert.alert("Error", "Please select a bank");
      if (!accountNumber.trim())
        return Alert.alert("Error", "Please enter your account number");

      setShowVerificationModal(true);
      handleVerifyBankDetails();
    }
  };

  const handleConfirmedWithdraw = async () => {
    if (!token || !activeAccount)
      throw new Error("No token or wallet connected");
    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");
    try {
      const txHash = await transferUSDC(amount, pretiumSettlementAddress);
      if (!txHash) throw new Error("Unable to send USDC");
      let offrampResult;
      if (selectedMethod?.type === "mobile_money") {
        offrampResult = await pretiumOfframp(
          `0${phoneNumber}`,
          parseFloat(calculateFinalAmount()),
          currentExchangeRate,
          amount,
          txHash,
          calculateFee(),
          token
        );
      } else {
        offrampResult = { success: true }; // TODO: Implement bank API
      }
      if (offrampResult.success) {
        setProcessingStep("completed");
        setTimeout(() => {
          setIsProcessing(false);
          const recipient =
            selectedMethod?.type === "mobile_money"
              ? formatPhoneNumber(selectedCountry.phoneCode, phoneNumber)
              : selectedBank?.name;
          Alert.alert(
            "Success!",
            `${
              selectedCountry.currency
            } ${calculateFinalAmount()} sent to ${recipient}`,
            [{ text: "OK", onPress: () => router.push("/wallet") }]
          );
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

  // Check if "Rest of the World" is selected
  const isRestOfWorld = selectedCountry.code === "ROW";

  // Can we allow user to confirm in the verification modal?
  const canConfirmWithdraw =
    !isVerifying &&
    !verificationError &&
    ((selectedMethod?.type === "mobile_money" &&
      !!getMobileDetails(verifiedPhoneData)) ||
      (selectedMethod?.type === "bank" &&
        (selectedCountry.code === "KE"
          ? !!getMobileDetails(bankValidation)
          : !!getBankDetails(bankValidation))));

  const isFormValid = () => {
    if (isRestOfWorld) return false;
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(currentToken.balance.toString());

    // Check basic amount validity
    if (!amount.trim() || amountNum <= 0 || amountNum > balanceNum) {
      return false;
    }

    // Check min/max limits if available
    if (limits && currentExchangeRate > 0) {
      const localCurrencyAmount = amountNum * currentExchangeRate;
      if (
        localCurrencyAmount < limits.min ||
        localCurrencyAmount > limits.max
      ) {
        return false;
      }
    }

    // Check method selection
    if (!selectedMethod) return false;

    // Check method-specific requirements
    if (selectedMethod.type === "mobile_money") {
      return isValidPhoneNumber(phoneNumber);
    }
    if (selectedMethod.type === "bank") {
      return selectedBank && accountNumber.trim();
    }
    return true;
  };

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
          <Text className="text-2xl font-bold text-white">Withdraw</Text>
          <View className="w-10" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Convert crypto to mobile money or bank
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
            {/* Coming Soon Overlay for Rest of the World */}
            {isRestOfWorld && (
              <View className="bg-white p-8 rounded-2xl shadow-sm items-center justify-center">
                <Image
                  source={require("@/assets/images/coming-soon.png")}
                  className="w-48 h-48 mb-4"
                  resizeMode="contain"
                />
                <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                  Coming Soon
                </Text>
                <Text className="text-base text-gray-600 text-center">
                  Withdrawals for {selectedCountry.name} are not yet available.
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2">
                  We're working on expanding our services. Stay tuned!
                </Text>
              </View>
            )}

            {/* Country Selection */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Select Country
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(true)}
                className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-gray-200">
                    <Text className="text-2xl">{selectedCountry.flag}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedCountry.name}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-0.5">
                      Currency: {selectedCountry.currency}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Payment Method Selection - Hide if Rest of World */}
            {!isRestOfWorld && (
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-4">
                  Withdrawal Method
                </Text>
                {selectedMethod ? (
                  <TouchableOpacity
                    onPress={() => !isRestOfWorld && setShowMethodModal(true)}
                    disabled={isRestOfWorld}
                    className="flex-row items-center justify-between p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      {selectedMethod.type === "mobile_money" &&
                      selectedMethod.logo ? (
                        <View>
                          <Image
                            source={selectedMethod.logo}
                            className="h-16 w-16 rounded-md mr-4"
                            resizeMode="contain"
                          />
                        </View>
                      ) : selectedMethod.type === "mobile_money" ? (
                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-emerald-200">
                          <Smartphone size={22} color="#10b981" />
                        </View>
                      ) : (
                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-emerald-200">
                          <Building2 size={22} color="#10b981" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {selectedMethod.name}
                        </Text>
                        {/* <Text className="text-xs text-gray-600 mt-0.5">
                        {selectedMethod.type === "mobile_money"
                          ? "Instant"
                          : "1-3 business days"}{" "}
                        • {selectedCountry.currency}
                      </Text> */}
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
                  <TouchableOpacity
                    onPress={() => !isRestOfWorld && setShowMethodModal(true)}
                    disabled={isRestOfWorld}
                    className="flex-row items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-500 font-medium">
                      Tap to select payment method
                    </Text>
                    <ChevronDown size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Mobile Money Number Input - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod?.type === "mobile_money" && (
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-2">
                  Mobile Money Number
                </Text>
                <Text className="text-sm text-gray-500 mb-3">
                  Enter your {selectedMethod.name} registered number
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                  <Text className="text-base font-semibold text-gray-700 mr-2">
                    +{selectedCountry.phoneCode}
                  </Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) =>
                      setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 12))
                    }
                    placeholder="712345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={12}
                    style={{ fontSize: 16, padding: 0, margin: 0 }}
                    className="flex-1"
                  />
                </View>
              </View>
            )}

            {/* Bank Transfer Details - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod?.type === "bank" && (
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm gap-4">
                <Text className="text-base font-bold text-gray-900">
                  Bank Transfer Details
                </Text>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Select Bank
                  </Text>
                  {selectedBank ? (
                    <TouchableOpacity
                      onPress={() => setShowBankModal(true)}
                      className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50"
                      activeOpacity={0.7}
                    >
                      <Text className="text-base font-semibold text-gray-900">
                        {selectedBank.name}
                      </Text>
                      <ChevronDown size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowBankModal(true)}
                      className="flex-row items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-500">Choose your bank</Text>
                      <ChevronDown size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Enter your account number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-base text-gray-900"
                  />
                </View>
              </View>
            )}

            {/* Amount Input Section - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod && (
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-4">
                  Withdrawal Amount
                </Text>
                <View className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50">
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    className="text-center text-4xl font-bold text-gray-900"
                  />
                  <Text className="text-center text-xs font-medium text-gray-500 mt-2">
                    USDC
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-4">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600">
                      Available:{" "}
                      <Text className="font-semibold">
                        {currentToken.balance} USDC
                      </Text>
                    </Text>
                    {limits && minUSDC && maxUSDC && (
                      <Text className="text-xs text-amber-600 mt-1">
                        Limits: {minUSDC} - {maxUSDC} USDC
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      // Set to max balance or max limit, whichever is smaller
                      const balanceNum = parseFloat(
                        currentToken.balance.toString()
                      );
                      const maxLimitNum = maxUSDC
                        ? parseFloat(maxUSDC)
                        : Infinity;
                      const maxAmount = Math.min(balanceNum, maxLimitNum);
                      setAmount(maxAmount.toFixed(2));
                    }}
                    className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300"
                    activeOpacity={0.7}
                  >
                    <Text className="text-downy-700 text-xs font-bold">
                      Max
                    </Text>
                  </TouchableOpacity>
                </View>
                {parseFloat(amount) > 0 && (
                  <>
                    <View className="my-5">
                      <View className="flex-1 h-px bg-gray-200" />
                    </View>
                    <View className="mb-4 flex-row justify-between items-center">
                      <Text className="text-sm font-semibold text-emerald-800">
                        Exchange Rate
                      </Text>
                      <Text className="text-sm font-bold text-emerald-700">
                        1 USDC = {currentExchangeRate.toFixed(2)}{" "}
                        {selectedCountry.currency}
                      </Text>
                    </View>
                    {(limits && Number(finalAmount) > limits?.max) ||
                      (limits && Number(finalAmount) < limits?.min && (
                        <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-2">
                          <Text className="text-xs text-amber-800 text-center">
                            💰 Limits: {limits.currency}{" "}
                            {formatCurrency(limits.min)} -{" "}
                            {formatCurrency(limits.max)} {limits.currency}
                            {/* {minUSDC && maxUSDC && (
                            <Text className="text-amber-700">
                              {" "}({minUSDC} - {maxUSDC} USDC)
                            </Text>
                          )} */}
                          </Text>
                        </View>
                      ))}
                    <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600">
                          {amount} USDC converts to
                        </Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {selectedCountry.currency}{" "}
                          {formatCurrency(totalAmount)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-sm text-gray-600">
                          Service Fee (0.5%)
                        </Text>
                        <Text className="text-sm font-semibold text-amber-600">
                          - {selectedCountry.currency} {formatCurrency(fee)}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-4 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                      <Text className="text-xs text-blue-600 font-semibold mb-2 text-center">
                        YOU'LL RECEIVE
                      </Text>
                      <Text className="text-3xl font-bold text-blue-600 text-center">
                        {selectedCountry.currency} {formatCurrency(finalAmount)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Submit Button - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod && (
              <>
                <TouchableOpacity
                  onPress={handleInitialWithdraw}
                  disabled={!isFormValid()}
                  className={`w-full py-4 rounded-2xl shadow-lg ${
                    isFormValid() ? "bg-downy-600" : "bg-gray-300"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-center font-bold text-lg ${
                      isFormValid() ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {selectedMethod.type === "mobile_money"
                      ? "Withdraw to Mobile Money"
                      : "Withdraw to Bank"}
                  </Text>
                </TouchableOpacity>
                {/* <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <Text className="text-xs text-blue-800 text-center">
                    💡 {getProcessingTimeText(selectedMethod.type)}
                  </Text>
                </View> */}
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

      {/* Verification Modal - shows verified details before confirming */}
      <Modal
        visible={showVerificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="bg-white rounded-3xl p-6 w-full shadow-2xl"
            style={{ maxWidth: 400 }}
          >
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              {selectedMethod?.type === "mobile_money"
                ? "Verify Phone Number"
                : "Confirm Bank Transfer"}
            </Text>
            {isVerifying ? (
              <View className="items-center py-4">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="mt-3 text-sm text-gray-700">
                  Verifying your details...
                </Text>
              </View>
            ) : verificationError ? (
              <View className="py-3">
                <Text className="text-sm text-red-600 text-center mb-3">
                  {verificationError}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowVerificationModal(false)}
                  className="mt-2 py-3 rounded-xl bg-gray-200"
                  activeOpacity={0.8}
                >
                  <Text className="text-center font-semibold text-gray-800">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {selectedMethod?.type === "mobile_money" &&
                  !!getMobileDetails(verifiedPhoneData) && (
                    <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                      {(() => {
                        const md = getMobileDetails(verifiedPhoneData);
                        if (!md) return null;
                        return (
                          <>
                            <Text className="text-sm text-gray-600 mb-1">
                              Phone Number
                            </Text>
                            <Text className="text-base font-semibold text-gray-900 mb-3">
                              {formatPhoneNumber(
                                selectedCountry.phoneCode,
                                phoneNumber
                              )}
                            </Text>
                            <Text className="text-sm text-gray-600 mb-1">
                              Account Name
                            </Text>
                            <Text className="text-base font-semibold text-gray-900 mb-3">
                              {md.public_name || "—"}
                            </Text>
                            <Text className="text-sm text-gray-600 mb-1">
                              Mobile Network
                            </Text>
                            <Text className="text-base font-semibold text-gray-900 mb-3">
                              {md.mobile_network || selectedMethod?.id || "—"}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                  )}

                {selectedMethod?.type === "bank" && selectedBank && (
                  <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                    <Text className="text-sm text-gray-600 mb-1">Bank</Text>
                    <Text className="text-base font-semibold text-gray-900 mb-3">
                      {selectedBank.name}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Account Number
                    </Text>
                    <Text className="text-base font-semibold text-gray-900 mb-3">
                      {accountNumber}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Account Name
                    </Text>
                    <Text className="text-base font-semibold text-gray-900">
                      {(() => {
                        if (selectedCountry.code === "KE") {
                          const md = getMobileDetails(bankValidation);
                          return md?.public_name || accountName || "—";
                        }
                        const bd = getBankDetails(bankValidation);
                        return bd?.account_name || accountName || "—";
                      })()}
                    </Text>
                  </View>
                )}

                <View className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
                  <Text className="text-xs text-blue-600 mb-1">
                    You are about to withdraw
                  </Text>
                  <Text className="text-lg font-bold text-blue-700 mb-1">
                    {amount} USDC
                  </Text>
                  <Text className="text-sm text-blue-800">
                    ≈ {selectedCountry.currency} {formatCurrency(finalAmount)}{" "}
                  </Text>
                </View>

                <View className="flex-row gap-3 mt-2">
                  <TouchableOpacity
                    onPress={() => setShowVerificationModal(false)}
                    className="flex-1 py-3 px-1 rounded-xl border border-gray-300"
                    activeOpacity={0.8}
                  >
                    <Text className="text-center font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmedWithdraw}
                    disabled={!canConfirmWithdraw}
                    className={`flex-1 py-3 px-1 rounded-xl ${
                      canConfirmWithdraw ? "bg-downy-600" : "bg-gray-300"
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        canConfirmWithdraw ? "text-white" : "text-gray-600"
                      }`}
                    >
                      Confirm Withdrawal
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Processing Modal - Keep inline as it's specific to withdraw */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View
            className="bg-white rounded-3xl p-8 w-full shadow-2xl"
            style={{ maxWidth: 400 }}
          >
            {processingStep === "processing" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Processing Withdrawal
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Sending {selectedCountry.currency} {finalAmount} to{" "}
                  {selectedMethod?.type === "mobile_money"
                    ? formatPhoneNumber(selectedCountry.phoneCode, phoneNumber)
                    : selectedBank?.name}
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
