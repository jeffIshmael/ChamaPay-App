import { serverUrl } from "@/constants/serverUrl";
import { useRouter } from "expo-router";
import { MessageSquare, Phone, Send, Shield } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import PhoneInput from "react-native-phone-number-input";
import { SafeAreaView } from "react-native-safe-area-context";


export default function PhoneVerificationScreen() {
  const router = useRouter();
  const phoneInput = useRef<any>(null);
  const PhoneInputComponent = PhoneInput as unknown as React.ComponentType<any>;
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");
  const [value, setValue] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "whatsapp">("sms");
  const [isValidNumber, setIsValidNumber] = useState(false);
  // If null, no SMS has been sent
  const [confirm, setConfirm] = useState<any>(null);

  // verification code (OTP - One-Time-Passcode)
  const [code, setCode] = useState('');

  const checkValidNumber = (keyedNumber:string) => {
    const valid = phoneInput.current?.isValidNumber(keyedNumber);
    setIsValidNumber(valid || false);
    return valid;
  };

  const getFormattedNumber = () => {
    return phoneInput.current?.getNumberAfterPossiblyEliminatingZero()?.formattedNumber || "";
  };

  const sendCode = async (method: string) => {
    setErrorText("");
    setInfoText("");
    
    if (!checkValidNumber(value)) {
      setErrorText("Please enter a valid phone number");
      return;
    }

    const formattedNumber = getFormattedNumber();
    setPhoneNumber(formattedNumber);

    try {
      setLoading(true);
      console.log("checking...");
      
      // Use React Native Firebase phone authentication
      // const confirmation = await signInWithPhoneNumber(getAuth(), formattedNumber);
      // console.log("confirm result", confirmation);
      // setConfirm(confirmation);
      if (deliveryMethod === "whatsapp"){
        const res = await fetch(`${serverUrl}/auth/send-whatsapp-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: formattedNumber })
        });
        if (!res.ok) {
          throw new Error("Failed to send WhatsApp OTP");
        }
        const data = await res.json();
        console.log("WhatsApp OTP response", data);
      }
  
      setTimeout(() => {
        setSent(true);
        setInfoText(`Code sent via ${deliveryMethod.toUpperCase()}. Check your messages.`);
        setLoading(false);
        
        // Navigate to OTP screen with params
        router.push({
          pathname: '/phone-otp-verify',
          params: {
            phoneNumber: getFormattedNumber(),
            deliveryMethod: deliveryMethod,
          }
        });
      }, 800);
    } catch (e: any) {
      setErrorText("Failed to send code. Try again.");
      console.log("error", e);
      setLoading(false);
      
      // Show more specific error messages
      if (e.code === 'auth/invalid-phone-number') {
        setErrorText("Invalid phone number format");
      } else if (e.code === 'auth/too-many-requests') {
        setErrorText("Too many requests. Please try again later");
      } else if (e.code === 'auth/quota-exceeded') {
        setErrorText("SMS quota exceeded. Please try again later");
      }
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#f8fafc" }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="items-center mb-8" style={{ paddingTop: 50 }}>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={[styles.headerIcon, { backgroundColor: "#059669" }]}
            >
              <Phone color="white" size={36} />
            </View>
            <Text className="text-4xl mb-3 text-gray-900 font-bold">
              Verify your phone
            </Text>
            <Text className="text-gray-500 text-center text-lg leading-6 px-4">
              We'll send a verification code to confirm your identity
            </Text>
          </View>

          {/* Messages */}
          {errorText ? (
            <View
              className="flex-row items-center bg-red-50 p-4 rounded-xl mb-6"
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#ef4444" }]}
            >
              <Shield color="#ef4444" size={20} />
              <Text className="text-red-600 ml-3 text-sm font-medium">{errorText}</Text>
            </View>
          ) : null}
          
          {infoText ? (
            <View
              className="flex-row items-center bg-emerald-50 p-4 rounded-xl mb-6"
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#059669" }]}
            >
              <Shield color="#059669" size={20} />
              <Text className="text-emerald-700 ml-3 text-sm font-medium">{infoText}</Text>
            </View>
          ) : null}

          {/* Phone Input Card */}
          <View className="bg-white rounded-2xl p-6 mb-6" style={styles.card}>
            <Text className="text-gray-700 text-base font-semibold mb-4">
              Enter your phone number
            </Text>
            
            <View style={styles.phoneInputContainer}>
              <PhoneInputComponent
                ref={phoneInput}
                defaultValue={value}
                defaultCode={countryCode}
                layout="first"
                autoFocus
                placeholder="712345678"
                withShadow={false}
                withDarkTheme={false}
                containerStyle={styles.phoneContainer}
                textContainerStyle={styles.textContainer}
                textInputStyle={styles.textInput}
                codeTextStyle={styles.codeText}
                flagButtonStyle={styles.flagButton}
                countryPickerButtonStyle={styles.countryPickerButton}
                countryPickerProps={{
                  withAlphaFilter: true,
                  withCallingCode: true,
                  withEmoji: true,
                  withFilter: true,
                  withFlag: true,
                  withModal: true,
                }}
                onChangeText={(text: string) => {
                  setValue(text);
                  setTimeout(checkValidNumber(text), 100); // Small delay to ensure state is updated
                }}
                onChangeFormattedText={(text: string) => {
                  setPhoneNumber(text);
                }}
                onChangeCountry={(country: any) => {
                  setCountryCode(country.cca2);
                  setTimeout(checkValidNumber(value), 100);
                }}
                textInputProps={{
                  maxLength: 15,
                  keyboardType: "phone-pad",
                }}
              />
            </View>

            {/* Delivery Method Selection */}
            <Text className="text-gray-700 text-base font-semibold mb-3 mt-6">
              How would you like to receive the code?
            </Text>
            
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDeliveryMethod("sms")}
                className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                  deliveryMethod === "sms" 
                    ? "bg-emerald-50 border-emerald-500" 
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <MessageSquare 
                  color={deliveryMethod === "sms" ? "#059669" : "#6b7280"} 
                  size={22} 
                />
                <Text className={`ml-2 font-semibold ${
                  deliveryMethod === "sms" ? "text-emerald-700" : "text-gray-600"
                }`}>
                  SMS
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDeliveryMethod("whatsapp")}
                className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                  deliveryMethod === "whatsapp" 
                    ? "bg-emerald-50 border-emerald-500" 
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Send 
                  color={deliveryMethod === "whatsapp" ? "#059669" : "#6b7280"} 
                  size={22} 
                />
                <Text className={`ml-2 font-semibold ${
                  deliveryMethod === "whatsapp" ? "text-emerald-700" : "text-gray-600"
                }`}>
                  WhatsApp
                </Text>
              </Pressable>
            </View>

            {/* Send Code Button */}
            <Pressable
              onPress={()=> sendCode(deliveryMethod)}
              className={`mt-6 py-4 rounded-xl items-center ${
                loading 
                  ? "bg-emerald-400" 
                  : isValidNumber 
                    ? "bg-emerald-600" 
                    : "bg-gray-300"
              }`}
              disabled={loading || !isValidNumber}
              style={!isValidNumber ? { opacity: 0.6 } : {}}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? "Sending..." : sent ? "Resend code" : "Send verification code"}
              </Text>
            </Pressable>
          </View>

          {/* Number Preview */}
          {phoneNumber && isValidNumber && (
            <View className="bg-gray-50 rounded-xl p-4 mb-6" style={styles.card}>
              <Text className="text-gray-500 text-sm mb-1">Code will be sent to:</Text>
              <Text className="text-gray-900 font-semibold text-base">{phoneNumber}</Text>
              <Text className="text-gray-500 text-sm mt-1">via {deliveryMethod.toUpperCase()}</Text>
            </View>
          )}

          {/* Spacer */}
          <View style={{ flexGrow: 1 }} />

          {/* Footer */}
          <View className="pb-8">
            <Text className="text-xs text-gray-400 text-center px-6 leading-5">
              By continuing, you agree to our{" "}
              <Text className="text-emerald-600 font-medium">Terms of Service</Text>
              {" "}and{" "}
              <Text className="text-emerald-600 font-medium">Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIcon: {
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  phoneInputContainer: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    overflow: "hidden",
  },
  phoneContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 56,
  },
  textContainer: {
    backgroundColor: "transparent",
    paddingVertical: 0,
  },
  textInput: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    paddingVertical: 16,
  },
  codeText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    paddingRight: 8,
  },
  flagButton: {
    backgroundColor: "transparent",
    paddingLeft: 16,
  },
  countryPickerButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 8,
  },
});