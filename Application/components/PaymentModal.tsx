import React, { useState } from "react";
import {
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CUSDPay from "./CUSDPay";
import MPesaPay from "./Mpesapay";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  const handlePaymentMethod = (method: string) => {
    setPaymentMethod(method);
  };

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
                      <Text className="text-lg font-medium">cUSD</Text>
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
              }}
              onSuccess={onSuccess}
              chamaId={chamaId}
              chamaBlockchainId={chamaBlockchainId}
              chamaName={chamaName}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;