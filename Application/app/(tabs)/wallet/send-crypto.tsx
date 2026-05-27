import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  User,
  WalletMinimal,
  X,
  Info,
  CheckCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  Modal,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { CameraView, useCameraPermissions } from "expo-camera";

import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { searchUsers, getUserByAddress } from "@/lib/chamaService";
import { internalTransferFee } from "@/Utils/transactionFeeUtils";

export default function SendCryptoScreen() {
  const [sendMode, setSendMode] = useState<"chamapay" | "external">("chamapay");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [searchResults, setSearchResults] = useState<
    {
      id: number;
      userName: string;
      email: string;
      smartAddress: string;
      profileImageUrl: string | null;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    userName: string;
    email: string;
    smartAddress: string;
    profileImageUrl: string | null;
  } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecipientFocused, setIsRecipientFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawUSDCBalance = useLocalSearchParams().USDCBalance;
  const tokenBalance = rawUSDCBalance
    ? Array.isArray(rawUSDCBalance)
      ? rawUSDCBalance[0]
      : rawUSDCBalance
    : "0.00";
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAmountChange = (text: string) => {
    setAmount(text);
  };

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("ChamaPay", message);
    }
  };

  // Search users with debouncing
  useEffect(() => {
    const searchForUsers = async () => {
      if (
        sendMode !== "chamapay" ||
        !recipient.trim() ||
        recipient.trim().length < 2
      ) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      // Don't search if a user is already selected (prevents search on selection)
      if (selectedUser && recipient === selectedUser.userName) {
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchUsers(recipient.trim());
        if (result.success && result.users) {
          setSearchResults(result.users);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
          setShowSearchResults(false);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [recipient, sendMode, selectedUser]);

  const handleOpenScanner = async () => {
    if (!permission) {
      const status = await requestPermission();
      if (status.granted) {
        setIsScanning(true);
      } else {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan QR codes.",
        );
      }
      return;
    }

    if (!permission.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan QR codes. Please enable it in your device settings.",
        );
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    if (!data) return;

    let cleanedData = data.trim();

    // Check if it's an Ethereum address with or without URI prefix
    if (cleanedData.toLowerCase().startsWith("ethereum:")) {
      cleanedData = cleanedData.substring(9);
    }

    if (cleanedData.includes("?")) {
      cleanedData = cleanedData.split("?")[0];
    }

    if (isValidAddress(cleanedData)) {
      try {
        const result = await getUserByAddress(cleanedData);
        if (result.success && result.user) {
          setSendMode("chamapay");
          handleUserSelect(result.user);
          showToast(`ChamaPay user @${result.user.userName} scanned!`);
        } else {
          setSendMode("external");
          setRecipient(cleanedData);
          setSelectedUser(null);
          showToast("External wallet address scanned!");
        }
      } catch (error) {
        console.error("Error looking up address:", error);
        setSendMode("external");
        setRecipient(cleanedData);
        setSelectedUser(null);
        showToast("Wallet address scanned!");
      }
      return;
    }

    // Check if it's a ChamaPay username
    let username = cleanedData;
    if (username.toLowerCase().startsWith("chamapay:")) {
      username = username.substring(9);
    }
    if (username.startsWith("@")) {
      username = username.substring(1);
    }

    const isValidUsername = /^[a-zA-Z0-9_]{2,30}$/.test(username);
    if (isValidUsername) {
      setSendMode("chamapay");
      setRecipient(username);
      setSelectedUser(null);
      showToast(`Username @${username} scanned! Searching...`);
      return;
    }

    Alert.alert(
      "Invalid QR Code",
      "The scanned QR code is not a valid Ethereum address or ChamaPay username.",
    );
  };

  const handleUserSelect = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setRecipient(user?.userName || "");
    setShowSearchResults(false);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSearchResults(false);
    }, 350);
  };

  // Validate Ethereum address
  const isValidAddress = (address: string): boolean => {
    if (!address || typeof address !== "string") return false;
    const trimmed = address.trim();
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) return false;
    const hexPart = trimmed.slice(2);
    return /^[0-9a-fA-F]+$/.test(hexPart);
  };

  // Validate amount
  const isValidAmount = (amountStr: string): boolean => {
    if (!amountStr || !amountStr.trim()) return false;
    const num = parseFloat(amountStr);
    return !isNaN(num) && num > 0 && isFinite(num);
  };

  const getFeeAmount = (): number => {
    if (sendMode === "chamapay") return 0;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0.01) return 0.01;
    try {
      return internalTransferFee(parsedAmount);
    } catch {
      return 1.0;
    }
  };

  const getTotalAmount = (): number => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return 0;
    return parsedAmount + getFeeAmount();
  };

  const hasEnoughBalance = (amountStr: string): boolean => {
    const num = parseFloat(amountStr);
    if (isNaN(num)) return false;
    const balance = parseFloat(tokenBalance) || 0;
    const fee = getFeeAmount();
    return num + fee <= balance;
  };

  const canSend = (): boolean => {
    if (!recipient.trim() || !isValidAmount(amount) || isProcessing)
      return false;
    if (sendMode === "chamapay" && !selectedUser) return false;
    if (sendMode === "external" && !isValidAddress(recipient)) return false;
    if (!hasEnoughBalance(amount)) return false;
    return true;
  };

  const handleSend = async () => {
    if (!token) {
      showToast("Please login to send transactions");
      return;
    }
    if (!recipient.trim() || !amount.trim()) {
      showToast("Please fill in all required fields");
      return;
    }

    if (sendMode === "chamapay" && !selectedUser) {
      showToast("Please select a user from the search results");
      return;
    }
    let receiver: `0x${string}` | null = null;
    if (sendMode === "chamapay" && selectedUser) {
      receiver = selectedUser.smartAddress as `0x${string}`;
    } else if (sendMode === "external" && recipient) {
      receiver = recipient as `0x${string}`;
    }

    if (!receiver) {
      showToast("Please select a user or enter a valid address");
      return;
    }
    const fee = sendMode === "chamapay" ? 0 : internalTransferFee(Number(amount));
    setIsProcessing(true);
    try {
      const response = await fetch(`${serverUrl}/user/sendUSDC`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver,
          amount,
          fee
        }),
      });
      const data = await response.json();
      if (!data.success) {
        showToast(data.message);
        return;
      }
      showToast("USDC sent successfully");
      setAmount("");
      setRecipient("");
      setSelectedUser(null);
      router.push("/wallet");
    } catch (error) {
      console.error("Error sending transaction:", error);
      showToast("Failed to send transaction");
      return;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-downy-800"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => {
              setRecipient("");
              setAmount("");
              setSelectedUser(null);
              router.push("/wallet");
            }}
            className="p-2 -ml-2"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Send USDC</Text>
          <View className="w-8" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Send USDC to Chamapay users or external wallets
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 bg-gray-50 rounded-t-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-8 gap-5">
          {/* Mode Tabs */}
          <View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setSendMode("chamapay");
                  setSelectedUser(null);
                  setRecipient("");
                  setAmount("");
                }}
                className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 border border-transparent ${
                  sendMode === "chamapay"
                    ? "bg-downy-600"
                    : "bg-white border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <Image
                  source={require("@/assets/images/chamapay-logo.png")}
                  className="w-8 h-8 rounded-md"
                  style={{
                    tintColor: sendMode === "chamapay" ? "#fff" : "#1c8584",
                  }}
                />
                <Text
                  className={`font-bold text-sm ${
                    sendMode === "chamapay" ? "text-white" : "text-gray-700"
                  }`}
                >
                  Chamapay user
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSendMode("external");
                  setSelectedUser(null);
                  setRecipient("");
                  setAmount("");
                }}
                className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 border border-transparent ${
                  sendMode === "external"
                    ? "bg-downy-600"
                    : "bg-white border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <WalletMinimal
                  color={sendMode === "external" ? "#fff" : "#1c8584"}
                  size={20}
                />
                <Text
                  className={`text-center font-semibold text-sm ${
                    sendMode === "external" ? "text-white" : "text-gray-700"
                  }`}
                >
                  External Wallet
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recipient Input */}
          <View
            className="bg-white px-5 py-6 rounded-2xl border border-gray-200"
            style={{ zIndex: 1000, elevation: 1000 }}
          >
            <Text className="text-base font-bold text-gray-900 mb-2">
              {sendMode === "chamapay" ? "Username" : "Recipient Address"}
            </Text>

            {sendMode === "chamapay" && !selectedUser && (
              <Text className="text-sm text-gray-500 mb-3">
                {
                  "Enter the recipient's Chamapay username or scan their QR code"
                }
              </Text>
            )}

            {sendMode === "chamapay" ? (
              selectedUser ? (
                <View className="flex-row items-center bg-gray-50 border border-emerald-500/20 p-4 rounded-xl">
                  <View className="w-12 h-12 bg-emerald-100 rounded-full items-center justify-center mr-3">
                    {selectedUser.profileImageUrl ? (
                      <Image
                        source={{ uri: selectedUser.profileImageUrl }}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <User size={24} color="#10b981" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 text-base">
                      @{selectedUser.userName}
                    </Text>
                    <Text className="text-xs text-gray-500 font-mono mt-0.5">
                      {selectedUser.smartAddress.slice(0, 8)}...
                      {selectedUser.smartAddress.slice(-6)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedUser(null);
                      setRecipient("");
                    }}
                    className="bg-gray-200/80 px-3 py-1.5 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold text-gray-600">
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="relative">
                  <View
                    className={`flex-row items-center bg-gray-50 rounded-xl border-2 px-4 transition-colors ${
                      isRecipientFocused
                        ? "border-downy-600"
                        : "border-gray-200"
                    }`}
                  >
                    <Text className="text-lg font-semibold text-emerald-600 mr-1">
                      @
                    </Text>
                    <TextInput
                      value={recipient}
                      onChangeText={(text) => {
                        setRecipient(text);
                        setSelectedUser(null);
                      }}
                      placeholder="username"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 text-base py-3"
                      onFocus={() => {
                        setIsRecipientFocused(true);
                        if (searchResults.length > 0) {
                          setShowSearchResults(true);
                        }
                      }}
                      onBlur={() => {
                        setIsRecipientFocused(false);
                        handleInputBlur();
                      }}
                    />
                    {isSearching && (
                      <View className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
                    )}
                    {/* <TouchableOpacity
                      onPress={handleOpenScanner}
                      className="p-1"
                      activeOpacity={0.7}
                    >
                      <Svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="#1c8584"
                      >
                        <Path d="M4 4h5V2H2v7h2V4zM4 15H2v7h7v-2H4v-5zM15 2v2h5v5h2V2h-7zM20 20h-5v2h7v-7h-2v5zM2 11h20v2H2z" />
                      </Svg>
                    </TouchableOpacity> */}
                  </View>

                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <View
                      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 max-h-48"
                      style={{ zIndex: 9999, elevation: 10 }}
                    >
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {searchResults.map((item: any) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => handleUserSelect(item)}
                            className="flex-row items-center p-3 border-b border-gray-100 last:border-b-0"
                            activeOpacity={0.7}
                          >
                            <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
                              {item.profileImageUrl ? (
                                <Image
                                  source={{ uri: item.profileImageUrl }}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <User size={20} color="#10b981" />
                              )}
                            </View>
                            <View className="flex-1">
                              <Text className="font-semibold text-gray-900">
                                @{item.userName}
                              </Text>
                              <Text className="text-xs text-gray-400 font-mono">
                                {item.smartAddress.slice(0, 6)}...
                                {item.smartAddress.slice(-4)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* User Not Found Message */}
                  {recipient.trim().length >= 2 &&
                    !isSearching &&
                    searchResults.length === 0 && (
                      <View className="absolute top-full left-0 right-0 mt-1 bg-red-50 border border-red-200 rounded-xl p-3 z-50">
                        <Text className="text-red-600 text-sm font-medium text-center">
                          User not found
                        </Text>
                      </View>
                    )}
                </View>
              )
            ) : (
              <View>
                <View className="flex-row items-center">
                  <TextInput
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="0x... or ENS name"
                    placeholderTextColor="#9CA3AF"
                    className={`flex-1 bg-gray-50 text-sm px-4 py-3 rounded-xl border-2 transition-colors ${
                      isRecipientFocused
                        ? "border-downy-600"
                        : "border-gray-200"
                    }`}
                    multiline
                    numberOfLines={2}
                    onFocus={() => setIsRecipientFocused(true)}
                    onBlur={() => setIsRecipientFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={handleOpenScanner}
                    className="w-12 h-12 bg-emerald-50 border-2 border-emerald-100 rounded-xl items-center justify-center ml-2"
                    activeOpacity={0.7}
                  >
                    <Svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="#1c8584"
                    >
                      <Path d="M4 4h5V2H2v7h2V4zM4 15H2v7h7v-2H4v-5zM15 2v2h5v5h2V2h-7zM20 20h-5v2h7v-7h-2v5zM2 11h20v2H2z" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                {/* Feedback for Ethereum Address */}
                {recipient.trim().length > 0 && isValidAddress(recipient) && (
                  <View className="flex-row items-center bg-emerald-50 border border-emerald-200 p-3 mt-3 rounded-xl gap-2">
                    <CheckCircle size={16} color="#059669" />
                    <Text className="text-emerald-800 text-xs font-medium">
                      Valid Ethereum address detected.
                    </Text>
                  </View>
                )}

                {recipient.trim().length > 0 && !isValidAddress(recipient) && (
                  <View className="flex-row items-center bg-red-50 border border-red-200 p-3 mt-3 rounded-xl gap-2">
                    <Info size={16} color="#dc2626" />
                    <Text className="text-red-700 text-xs font-medium flex-1">
                      Invalid address format. Must be a 42-character hex address
                      (starts with 0x).
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View
            className="bg-white p-5 rounded-2xl border border-gray-200"
            style={{ zIndex: 1, elevation: 1 }}
          >
            {sendMode !== "chamapay" && (
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-bold text-gray-900">
                  Amount
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-xs font-medium mr-1">
                    Min: 0.1 USDC
                  </Text>
                
                </View>
              </View>
            )}

            <View
              className={`flex-row items-center bg-gray-50 rounded-xl border-2 px-4 py-1 transition-colors ${
                isAmountFocused ? "border-downy-600" : "border-gray-200"
              }`}
            >
              <Text className="text-2xl font-bold text-gray-400 mr-2">$</Text>
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="numeric"
                className="flex-1 text-2xl font-bold text-gray-900 py-3"
                placeholderTextColor="#9ca3af"
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
              />
              <TouchableOpacity
                onPress={() =>
                  handleAmountChange(parseFloat(tokenBalance).toString())
                }
                className="px-3 py-1.5 bg-emerald-100 rounded-lg"
                activeOpacity={0.7}
              >
                <Text className="text-emerald-700 text-xs font-bold uppercase">
                  Max
                </Text>
              </TouchableOpacity>
            </View>
            <View className=" flex-row gap-1 items-center mt-2">
              <Text className="text-gray-500 text-xs font-medium">
                Balance:
              </Text>
              <Text className="text-gray-700 font-semibold text-xs">
                {parseFloat(tokenBalance).toFixed(2)} USDC
              </Text>
            </View>

            <View className=" h-px bg-gray-300 mt-4" />
            {/* Transaction Summary Card */}
            <View className="mt-4">

              <View className="gap-2.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-xs font-medium">
                    Recipient Type
                  </Text>
                  <Text className="text-gray-800 font-semibold text-xs">
                    {sendMode === "chamapay"
                      ? "ChamaPay User"
                      : "External Wallet"}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-xs font-medium">
                    Transfer Fee
                  </Text>
                  {sendMode === "chamapay" ? (
                    <View className=" px-2 py-0.5 ">
                      <Text className="text-emerald-700 font-bold text-[10px] tracking-wide uppercase">
                        Free
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-emerald-700 font-semibold text-xs">
                      {isValidAmount(amount)
                        ? `${getFeeAmount().toFixed(2)} USDC`
                        : "--- USDC"}
                    </Text>
                  )}
                </View>

                {isValidAmount(amount) && (
                  <>
                    <View className="h-px bg-gray-100 my-1" />

                    <View className="flex-row justify-between items-center">
                      <Text className="text-gray-500 text-xs font-medium">
                        Amount to Send
                      </Text>
                      <Text className="text-gray-800 font-semibold text-xs">
                        {parseFloat(amount).toFixed(2)} USDC
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text className="text-gray-900 font-bold text-sm">
                        Total Deducted
                      </Text>
                      <Text className="text-downy-700 font-extrabold text-sm">
                        {getTotalAmount().toFixed(2)} USDC
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Validation Warnings */}
          {isValidAmount(amount) && !hasEnoughBalance(amount) && (
            <Text className="text-red-500 text-xs text-center font-medium px-4">
              Insufficient balance to cover amount and transaction fee.
            </Text>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend()}
            className={`w-full py-4 rounded-2xl flex-row items-center justify-center ${
              !canSend() ? "bg-gray-300" : "bg-downy-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center text-lg font-bold ${
                !canSend() ? "text-gray-500" : "text-white"
              }`}
            >
              {isProcessing ? "Sending..." : "Send USDC"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={isScanning}
        animationType="slide"
        onRequestClose={() => setIsScanning(false)}
      >
        <View
          style={StyleSheet.absoluteFillObject}
          className="bg-black flex-1 justify-center items-center"
        >
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />

          {/* Scanner Overlay UI */}
          <View className="absolute inset-0 border-[40px] border-black/60 flex-1 justify-center items-center">
            {/* Target scanning box */}
            <View className="w-64 h-64 border-2 border-emerald-400 rounded-2xl bg-transparent" />
            <Text className="text-white text-center font-semibold mt-8 px-4 bg-black/70 py-2.5 rounded-xl text-sm overflow-hidden">
              Scan ChamaPay username or address QR code
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={() => setIsScanning(false)}
            className="absolute top-12 right-6 w-12 h-12 bg-black/60 rounded-full items-center justify-center border border-white/20"
            activeOpacity={0.7}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
