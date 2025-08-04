import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MPesaPay = () => {
  return (
    <View className="bg-white p-5 rounded-lg shadow-lg w-full">
      <View className="flex-row items-center mb-5">
        <Image source={require('../assets/images/mpesa.png')} className="w-[70px] h-[50px] mr-5" />
        <Text className="text-xl font-semibold">Pay with MPesa</Text>
      </View>
      <View className="w-full">
        <View className="mb-2.5">
          <Text className="text-sm text-gray-500 mb-1.5">Phone No (To pay from)</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-2.5 py-2"
            placeholder="Input number"
            keyboardType="numeric"
          />
        </View>
        <View className="mb-2.5">
          <Text className="text-sm text-gray-500 mb-1.5">Amount</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-2.5 py-2"
            placeholder="Input amount"
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity className="py-3 rounded-lg bg-blue-300 items-center justify-center" disabled>
          <Text className="text-white font-semibold">Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MPesaPay;