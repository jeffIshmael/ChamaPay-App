import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, Image, Linking, Modal, Text,
    TextInput,
    TouchableOpacity, View
} from "react-native";
import { serverUrl } from "../constants/serverUrl";

const CUSDPay = ({
  visible,
  onClose,
  onSuccess,
  chamaId,
  chamaBlockchainId,
  chamaName,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chamaId: number;
  chamaBlockchainId: number;
  chamaName: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [fetchingTxFee, setFetchingTxFee] = useState(false);
  const [transactionFee, setTransactionFee] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [txHash, setTxHash] = useState("");
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      // Validate input
      const paymentAmount = Number(amount);
      if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount)) {
        setError("Please enter a valid amount");
        return;
      }

      if (paymentAmount > balance) {
        setError("Insufficient balance");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Send request with proper body format
      const response = await axios.post(
        `${serverUrl}/chama/deposit/${chamaId}`,
        {
          amount: amount.toString(), // Send as string to avoid floating point issues
          blockchainId: chamaBlockchainId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setTxHash(response.data.txHash);
      setShowSuccessModal(true);
    } catch (error) {
      console.log("Payment error:", error);
      setError("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.log("No token found");
          return;
        }
        const response = await axios.get(`${serverUrl}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response) {
          // console.log(response.data);
          setBalance(Number(response.data.balance));
        }
      } catch (error) {
        console.log("Error fetching user:", error);
        Alert.alert("Error", "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleAmountChange = async (text: string) => {
    setAmount(text);
    if (Number(text) <= 0) {
      return;
    }
    setFetchingTxFee(true);

    // Get the tx fee for the amount
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found");
        return;
      }
      const response = await axios.get(`${serverUrl}/transaction`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { amount: text },
      });
      if (response) {
        setTransactionFee(Number(response.data.fee));
        setFetchingTxFee(false);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setFetchingTxFee(false);
    }
  };

  //function to handle the gas fee
  const formatGasFee = (gasFee: number) => {
    if (gasFee > 0.01) {
      return `${gasFee.toFixed(4)}`;
    } else if (gasFee > 0.0001) {
      return `${gasFee.toFixed(6)}`;
    } else {
      return `< 0.0001`;
    }
  };
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-lg">
          <View className="w-10 h-1 bg-gray-300 rounded self-center mb-4" />
          <View>
            <View className="flex-row items-center mb-6">
              <Image
                source={require("../assets/images/cusd.jpg")}
                className="w-12 h-12 mr-4"
              />
              <Text className="text-xl font-semibold text-gray-900">Pay with cUSD</Text>
            </View>

            <View className="w-full">
              <View className="mb-4">
                <Text className="text-sm text-gray-700 mb-2 font-medium">Amount (cUSD)</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
                  placeholder="0"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                />
                {error ? <Text className="text-red-500 text-xs mt-2">{error}</Text> : null}
              </View>

              <Text className="text-black font-light text-base mb-4">
                Available balance: {balance.toFixed(2)} cUSD
              </Text>

              {fetchingTxFee ? (
                <View className="flex-row items-center mb-4">
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.1)", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="flex-1 justify-center pl-2"
                  >
                    <Text className="text-gray-500 text-sm">
                      Calculating fee...
                    </Text>
                  </LinearGradient>
                </View>
              ) : (
                <Text className="text-black font-light text-base mb-6">
                  Transaction fee:{" "}
                  {transactionFee === null ? 0 : formatGasFee(transactionFee)}{" "}
                  cUSD
                </Text>
              )}

              <TouchableOpacity
                className={`py-4 rounded-xl shadow-md ${loading ? 'bg-blue-200' : 'bg-blue-200'}`}
                onPress={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="gray" />
                    <Text className="text-gray-500 font-semibold text-base ml-2">Processing...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Ionicons
                      name="paper-plane"
                      size={20}
                      color="#000"
                      className="mr-3"
                    />
                    <Text className="text-black font-semibold text-base">Pay</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CUSDPay;
