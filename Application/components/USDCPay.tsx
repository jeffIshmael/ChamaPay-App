import { useAuth } from "@/Contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal, Text,
  TextInput,
  TouchableOpacity, View
} from "react-native";
import { prepareContractCall, sendTransaction, toUnits, waitForReceipt } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { parseEther } from "viem";
import { serverUrl } from "../constants/serverUrl";
import { chain, chamapayContract, client,usdcContract } from "../constants/thirdweb";

const USDCPay = ({
  visible,
  onClose,
  onSuccess,
  chamaId,
  chamaBlockchainId,
  USDCBalance,
  chamaName,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data?: { txHash: string; message: string; amount: string }) => void;
  chamaId: number;
  chamaBlockchainId: number;
  USDCBalance: string;
  chamaName: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const { user, token } = useAuth();

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

      const totalAmount = paymentAmount + transactionFee;
      if (totalAmount > Number(USDCBalance)) {
        setError(`Insufficient balance. Total required: ${totalAmount.toFixed(4)} USDC (including 0.5% fee)`);
        return;
      }

      if (!activeAccount) {
        setError("Wallet not connected");
        return;
      }

      if (!token) {
        setError("Authentication required");
        return;
      }

      // Convert amount to wei for blockchain transaction
      const amountInWei = toUnits(totalAmount.toString(),6);
      console.log("the amount in wei", amountInWei);
      console.log("the chama blockchain id", chamaBlockchainId);

      // first call approve function
      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount)",
        params: [chamapayContract.address, amountInWei],
      });
      const { transactionHash: approveTransactionHash } = await sendTransaction({
        account: activeAccount,
        transaction: approveTransaction,
      });
      const approveTransactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: approveTransactionHash,
      });
      console.log("the approve transaction receipt", approveTransactionReceipt);

      if (!approveTransactionReceipt) {
        setError("Failed to approve transaction");
        return;
      }

      // Prepare the deposit transaction
      const depositTransaction = prepareContractCall({
        contract: chamapayContract,
        method: "function depositCash(uint256 _chamaId, uint256 _amount)",
        params: [BigInt(chamaBlockchainId), amountInWei],
      });

      // Send the blockchain transaction
      const { transactionHash } = await sendTransaction({
        account: activeAccount,
        transaction: depositTransaction,
      });

      // get the receipt of the transaction
      const receipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: transactionHash,
      });

      console.log("the receipt", receipt);

      // Send the transaction hash to the server for recording
      const response = await axios.post(
        `${serverUrl}/chama/deposit`,
        {
          amount: amount.toString(),
          blockchainId: chamaBlockchainId,
          txHash: receipt.transactionHash,
          chamaId: chamaId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setTxHash(transactionHash);
      setSuccessMessage(`Successfully deposited ${amount} USDC to ${chamaName}`);
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.log("Payment error:", error);
      setError("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleAmountChange = (text: string) => {
    setAmount(text);
    setError("");
    if (Number(text) <= 0) {
      setTransactionFee(0);
      return;
    }
    
    // Calculate 0.5% transaction fee locally
    const amountValue = Number(text);
    const fee = amountValue * 0.005; // 0.5% of the amount
    setTransactionFee(fee);
  };

  const handleClose = () => {
    setAmount("");
    setTransactionFee(0);
    setShowSuccessModal(false);
    onClose();
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setAmount("");
    setTransactionFee(0);
    setError("");
    setTxHash("");
    setSuccessMessage("");
    // Call onClose to reload the page
    onClose();
  };

  //function to handle the gas fee
  const formatGasFee = (gasFee: number) => {
    if (gasFee > 0.01) {
      return `${gasFee.toFixed(3)}`;
    } else if (gasFee > 0.001) {
      return `${gasFee.toFixed(4)}`;
    } else {
      return `< 0.001`;
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
        onPress={handleClose}
      />
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-lg">
          <View className="w-10 h-1 bg-gray-300 rounded self-center mb-4" />
          <View>
            <View className="flex-row items-center mb-6">
              <Image
                source={require("../assets/images/usdclogo.png")}
                className="w-12 h-12 mr-4"
              />
              <Text className="text-xl font-semibold text-gray-900">Pay with USDC</Text>
            </View>

            <View className="w-full">
              <View className="mb-4">
                <Text className="text-sm text-gray-700 mb-2 font-medium">Amount (USDC)</Text>
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
                Available balance: {Number(USDCBalance).toFixed(3)} USDC
              </Text>

              {Number(amount) > 0 && (<View className="mb-6">
                <Text className="text-black font-light text-base mb-2">
                  Transaction fee (0.5%):{" "}
                  {formatGasFee(transactionFee)} {" "}
                  USDC
                </Text>
               
                  <Text className="text-black font-semibold text-base">
                    Total: {(Number(amount) + transactionFee).toFixed(3)} USDC
                  </Text>
                </View>
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-6 shadow-lg">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark" size={32} color="#059669" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">
                Payment Successful!
              </Text>
              <Text className="text-gray-600 text-center mb-4">
                {successMessage}
              </Text>
              <View className="bg-gray-50 rounded-lg p-3 mb-4 w-full">
                <Text className="text-sm text-gray-500 mb-1">Transaction Hash:</Text>
                <Text className="text-xs text-gray-700 font-mono" numberOfLines={1}>
                  {txHash}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSuccessClose}
              className="bg-emerald-600 py-3 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-center text-base">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default USDCPay;
