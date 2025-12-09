import React, { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { sendMpesaStkPush } from '@/lib/mpesaService'; // Adjust path as needed
import { useAuth } from '@/Contexts/AuthContext';



const MPesaPay= () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const {token} = useAuth();

  const handlePay = async () => {
    // Validation
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number (9 digits)');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if(!token){
      Alert.alert('No token set.');
      return;
    }

    setLoading(true);
    
    try {
      // Combine +254 with the phone number entered
      const fullPhoneNumber = `254${phoneNumber}`;
      console.log("full number", Number(fullPhoneNumber));
      const result = await sendMpesaStkPush(
        Number(fullPhoneNumber),
        amount,
        token
      );

      if (result.success) {
        Alert.alert(
          'Payment Initiated',
          'Please check your phone and enter your M-Pesa PIN to complete the payment.',
          [
            {
              text: 'OK',
              onPress: () => console.log("It works."),
            },
          ]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          result.error || 'Failed to initiate payment. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = phoneNumber.length >= 9 && amount && parseFloat(amount) > 0;

  return (
    <View className="bg-white rounded-t-3xl shadow-2xl w-full px-6 py-8">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center flex-1">
          <Image 
            source={require('../assets/images/mpesa.png')} 
            className="w-16 h-12 mr-3" 
            resizeMode="contain"
          />
          <Text className="text-2xl font-bold text-gray-800">M-Pesa Payment</Text>
        </View>
      </View>

      {/* Form */}
      <View className="w-full">
        {/* Phone Number Input */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
          <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <View className="bg-green-600 px-4 py-3.5 border-r border-gray-300">
              <Text className="text-white font-semibold text-base">+254</Text>
            </View>
            <TextInput
              className="flex-1 px-4 py-3 text-base text-gray-800"
              placeholder="712345678"
              keyboardType="phone-pad"
              maxLength={9}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1.5">Enter your M-Pesa registered number</Text>
        </View>

        {/* Amount Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Amount (KES)</Text>
          <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <View className="px-4 py-3.5">
              <Text className="text-gray-600 font-semibold text-base">KES</Text>
            </View>
            <TextInput
              className="flex-1 px-4 py-3 text-base text-gray-800"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!loading}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1.5">Minimum amount: KES 1</Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          className={`py-4 rounded-xl items-center justify-center ${
            isFormValid && !loading ? 'bg-green-600' : 'bg-gray-300'
          }`}
          disabled={!isFormValid || loading}
          onPress={handlePay}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-base">
              {isFormValid ? 'Pay Now' : 'Enter Details'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <View className="mt-4 bg-blue-50 rounded-lg p-3">
          <Text className="text-xs text-blue-800 text-center">
            You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MPesaPay;