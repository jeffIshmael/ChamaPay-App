import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/Contexts/AuthContext";
import { getAllBalances } from "@/constants/thirdweb";
import CUSDPay from "./CUSDPay";
import MPesaPay from "./Mpesapay";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data?: { txHash: string; message: string; amount: string }) => void;
  chamaId: number;
  chamaBlockchainId: number;
  chamaName: string;
}

const PaymentModal = ({
  visible,
  onClose,
  onSuccess,
  chamaId,
  chamaBlockchainId,
  chamaName,
}: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showCUSDPay, setShowCUSDPay] = useState(false);
  const [showMPesaPay, setShowMPesaPay] = useState(false);
  const [cUSDBalance, setcUSDBalance] = useState <string | null>(null);
  const { user } = useAuth();

  const handlePaymentMethod = (method: string) => {
    setPaymentMethod(method);
  };

  const handlePaymentSuccess = () => {
    // CUSDPay will handle its own success modal
    // Just close the CUSDPay component and reset
    setShowCUSDPay(false);
    setPaymentMethod("");
  };


  useEffect(() => {
    console.log("the payment method", paymentMethod);
    const fetchcUSDBalance = async () => {
      const balance = await getAllBalances(user?.address as string);
      setcUSDBalance((balance.cUSD.displayValue));
    };
    fetchcUSDBalance();
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
                      handlePaymentMethod("cusd");
                      setShowCUSDPay(true);
                    }}
                    className="flex-row justify-between items-center py-3 px-5 bg-gray-50 rounded-lg w-full my-2"
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={require("../assets/images/cusd.jpg")}
                        className="w-10 h-10 mr-4"
                      />
                      <View>
                        <Text className="text-lg font-medium">cUSD</Text>
                        <Text className="text-xs text-gray-500">{Number(cUSDBalance).toFixed(3)} cUSD</Text>
                      </View>
                    </View>
                   
                    <Text className="text-2xl text-gray-500">➔</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePaymentMethod("mpesa")}
                    className="flex-row justify-between items-center py-3 px-5 bg-gray-50 rounded-lg w-full my-2"
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={require("../assets/images/mpesa.png")}
                        className="w-10 h-10 mr-4"
                      />
                      <Text className="text-lg font-medium">M-Pesa</Text>
                    </View>
                    <Text className="text-2xl text-gray-500">➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : paymentMethod === "mpesa" ? (
            <MPesaPay /> // MPesaPay component
          ) : (
            <CUSDPay
              visible={showCUSDPay}
              onClose={() => {
                setPaymentMethod("");
                setShowCUSDPay(false);
                onClose();
              }}
              onSuccess={handlePaymentSuccess}
              chamaId={chamaId}
              chamaBlockchainId={chamaBlockchainId}
              cUSDBalance={cUSDBalance || "0"}
              chamaName={chamaName}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;