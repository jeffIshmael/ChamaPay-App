import { searchUsers } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import { ArrowLeft, User, WalletMinimal } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useLocalSearchParams } from "expo-router";

export default function SendCryptoScreen() {
  const [sendMode, setSendMode] = useState<"chamapay" | "external">("chamapay");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      userName: string;
      email: string;
      address: string;
      profileImageUrl: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    userName: string;
    email: string;
    address: string;
    profileImageUrl: string | null;
  } | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { USDCBalance, totalBalance, address } = useLocalSearchParams();

  // Fixed to USDC only - no need to display
  const tokenBalance = USDCBalance;

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
  }, [recipient, sendMode]);

  const scanQR = () => {
    Alert.alert("QR Scanner", "QR code scanner would open here");
  };

  const handleUserSelect = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setRecipient(user?.userName || "");
    setShowSearchResults(false);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleSend = () => {
    if (!recipient.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (sendMode === "chamapay" && !selectedUser) {
      Alert.alert("Error", "Please select a user from the search results");
      return;
    }

    Alert.alert("Send Crypto", `Sending ${amount} USDC...`);
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
            onPress={() => router.push("/wallet")}
            className="p-2 -ml-2"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Send USDC</Text>
          <View className="w-8" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Send USDC to ChamaPay users or external wallets
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
                className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 ${
                  sendMode === "chamapay"
                    ? "bg-downy-600 shadow-md"
                    : "bg-white border-2 border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <Image
                  source={require("@/assets/images/logo.png")}
                  className="w-6 h-6 rounded-md"
                  style={{
                    tintColor: sendMode === "chamapay" ? "#fff" : "#059669",
                  }}
                />
                <Text
                  className={`font-bold text-sm ${
                    sendMode === "chamapay" ? "text-white" : "text-gray-700"
                  }`}
                >
                  ChamaPay User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSendMode("external");
                  setSelectedUser(null);
                  setRecipient("");
                  setAmount("");
                }}
                className={`flex-1 py-4 px-4 rounded-xl flex-row items-center justify-center gap-2 ${
                  sendMode === "external"
                    ? "bg-downy-600"
                    : "bg-white border-2 border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <WalletMinimal
                  color={sendMode === "external" ? "#fff" : "#059669"}
                  size={20}
                />
                <Text
                  className={`text-center font-semibold ${
                    sendMode === "external" ? "text-white" : "text-gray-600"
                  }`}
                >
                  External Wallet
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recipient Input */}
          <View
            className="bg-white px-5 py-6 rounded-2xl shadow-sm"
            style={{ zIndex: 1000, elevation: 1000 }}
          >
            <Text className="text-base font-bold text-gray-900 mb-2">
              {sendMode === "chamapay" ? "Username" : "Recipient Address"}
            </Text>

            {sendMode === "chamapay" && (
              <Text className="text-sm text-gray-500 mb-3">
                Enter the recipient's ChamaPay username
              </Text>
            )}

            {sendMode === "chamapay" ? (
              <View className="relative">
                <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4">
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
                      if (searchResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    onBlur={handleInputBlur}
                  />
                  {isSearching && (
                    <View className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </View>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <View
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48"
                    style={{ zIndex: 9999, elevation: 10 }}
                  >
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
                            {item.address.slice(0, 6)}...
                            {item.address.slice(-4)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
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
            ) : (
              <View className="flex-row items-center space-x-2">
                <TextInput
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="0x... or ENS name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 bg-gray-50 text-sm px-4 py-3 rounded-xl border-2 border-gray-200"
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity
                  onPress={scanQR}
                  className="w-12 h-12 border-2 border-downy-600 rounded-md items-center justify-center shadow-md ml-2"
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
            )}
          </View>

          {/* Amount Input */}
          <View
            className="bg-white p-5 rounded-2xl shadow-sm"
            style={{ zIndex: 1, elevation: 1 }}
          >
            <Text className="text-base font-bold text-gray-900 mb-3">
              Amount
            </Text>
            <View className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                className="text-center text-3xl font-bold text-gray-900"
              />
              <Text className="text-center text-sm text-gray-500 mt-2">
                USDC
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-3 px-1">
              <Text className="text-sm text-gray-600">
                Available:{" "}
                <Text className="font-semibold">{tokenBalance} USDC</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setAmount(tokenBalance.toString())}
                className="px-4 py-1.5 bg-emerald-100 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-emerald-700 text-sm font-bold">Max</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={
              !recipient.trim() ||
              !amount.trim() ||
              (sendMode === "chamapay" && !selectedUser)
            }
            className={`w-full py-4 rounded-2xl shadow-lg ${
              !recipient.trim() ||
              !amount.trim() ||
              (sendMode === "chamapay" && !selectedUser)
                ? "bg-gray-300"
                : "bg-downy-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center text-lg font-bold ${
                !recipient.trim() ||
                !amount.trim() ||
                (sendMode === "chamapay" && !selectedUser)
                  ? "text-gray-500"
                  : "text-white"
              }`}
            >
              Send USDC
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
