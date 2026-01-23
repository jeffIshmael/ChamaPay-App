import React, { useEffect, useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/Contexts/AuthContext";
import { getAllBalances } from "@/constants/thirdweb";
import USDCPay from "./USDCPay";
import MobileMoneyPay from "./MobileMoneyPay";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data?: {
    txHash: string;
    message: string;
    amount: string;
  }) => void;
  chamaId: number;
  chamaBlockchainId: number;
  chamaName: string;
  remainingAmount: number;
  paymentAmount: number;
}

const PaymentModal = ({
  visible,
  onClose,
  onSuccess,
  chamaId,
  chamaBlockchainId,
  chamaName,
  remainingAmount,
  paymentAmount,
}: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showUSDCPay, setShowUSDCPay] = useState(false);
  const [USDCBalance, setUSDCBalance] = useState<string | null>(null);
  const { user } = useAuth();

  const handlePaymentMethod = (method: string) => {
    setPaymentMethod(method);
  };

  const handlePaymentSuccess = () => {
    // USDCPay will handle its own success modal
    // Just close the USDCPay component and reset
    setShowUSDCPay(false);
    setPaymentMethod("");
  };

  useEffect(() => {
    console.log("the payment method", paymentMethod);
    const fetchUSDCBalance = async () => {
      const balance = await getAllBalances(user?.address as `0x${string}`);
      setUSDCBalance(balance.USDC.displayValue);
    };
    fetchUSDCBalance();
  }, [user?.address]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setPaymentMethod("");
        onClose();
      }}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="absolute inset-0" onPress={onClose} />
        <View>
          {!paymentMethod ? (
            <>
              <View className="bg-white rounded-t-[30px] p-4 pb-8 items-center">
                <Text className="text-xl font-semibold mb-5">Pay with:</Text>
                <View className="w-full items-center">
                  <TouchableOpacity
                    onPress={() => {
                      handlePaymentMethod("USDC");
                      setShowUSDCPay(true);
                    }}
                    className="flex-row justify-between items-center py-3 px-5 bg-gray-50 rounded-lg w-full my-2"
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={require("../assets/images/usdclogo.png")}
                        className="w-10 h-10 mr-4"
                      />
                      <View>
                        <Text className="text-lg font-medium">USDC</Text>
                        <Text className="text-xs text-gray-500">
                          {Number(USDCBalance).toFixed(3)} USDC
                        </Text>
                      </View>
                    </View>

                    <Text className="text-2xl text-gray-500">➔</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePaymentMethod("mobileMoney")}
                    className="flex-row justify-between items-center py-4 px-5 bg-gray-50 rounded-lg w-full my-2"
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={require("../assets/images/mpesa.png")}
                        className="w-10 h-10 mr-2"
                        resizeMode="contain"
                      />
                      <Text className="text-lg font-medium">M-Pesa</Text>
                    </View>
                    <Text className="text-2xl text-gray-500">➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : paymentMethod === "mobileMoney" ? (
            <MobileMoneyPay
              chamaName={chamaName}
              chamaBlockchainId={chamaBlockchainId}
              chamaId={chamaId}
              onClose={() => onClose()}
              onBack={()=>setPaymentMethod("")}
              remainingAmount={remainingAmount}
              contributionAmount={paymentAmount}
            /> // MobileMoney Pay component
          ) : (
            <USDCPay
              visible={showUSDCPay}
              onClose={() => {
                onClose();
              }}
              onBack={()=>setPaymentMethod("")}
              onSuccess={handlePaymentSuccess}
              chamaId={chamaId}
              chamaBlockchainId={chamaBlockchainId}
              USDCBalance={USDCBalance || "0"}
              chamaName={chamaName}
              remainingAmount={remainingAmount}
              contributionAmount={paymentAmount}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;
