import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, ArrowRight, Delete, Fingerprint, ShieldCheck } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View
} from "react-native";


const PIN_LENGTH = 4;

export default function PinSetup() {
    const router = useRouter();
    const [step, setStep] = useState<"enter" | "confirm">("enter");
    const [pin, setPin] = useState<string[]>([]);
    const [confirmPin, setConfirmPin] = useState<string[]>([]);
    const [biometricSupported, setBiometricSupported] = useState(false);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(compatible && enrolled);
    };

    const handleBiometricSetup = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Set up biometric authentication",
                fallbackLabel: "Use PIN instead",
            });

            if (result.success) {
                // Generate a random PIN for backend purposes
                const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                await SecureStore.setItemAsync("user_pin", randomPin);
                await SecureStore.setItemAsync("biometric_enabled", "true");

                finishSetup();
            }
        } catch (error) {
            console.log("Biometric setup failed", error);
            ToastAndroid.show("Failed to set up biometric authentication. Please use PIN instead.", ToastAndroid.SHORT);
        }
    };

    const handlePress = (key: string) => {
        const currentPin = step === "enter" ? pin : confirmPin;
        const setCurrentPin = step === "enter" ? setPin : setConfirmPin;

        if (key === "backspace") {
            setCurrentPin((prev) => prev.slice(0, -1));
        } else if (currentPin.length < PIN_LENGTH) {
            const newPin = [...currentPin, key];
            setCurrentPin(newPin);

            if (newPin.length === PIN_LENGTH) {
                if (step === "enter") {
                    // Don't auto-proceed, wait for user to click proceed button
                } else {
                    validateAndSave(newPin);
                }
            }
        }
    };

    const proceedToConfirm = () => {
        if (pin.length === PIN_LENGTH) {
            setStep("confirm");
        }
    };

    const validateAndSave = async (enteredConfirmPin: string[]) => {
        if (pin.join("") === enteredConfirmPin.join("")) {
            await savePin(pin.join(""));
        } else {
            Alert.alert("Mismatch", "PINs do not match. Please start over.");
            setStep("enter");
            setPin([]);
            setConfirmPin([]);
        }
    };

    const savePin = async (finalPin: string) => {
        try {
            await SecureStore.setItemAsync("user_pin", finalPin);

            // Prompt for biometrics
            const compatible = await LocalAuthentication.hasHardwareAsync();
            if (compatible) {
                Alert.alert(
                    "Enable Biometrics?",
                    "Would you like to use FaceID or Fingerprint for faster access?",
                    [
                        {
                            text: "No thanks",
                            style: "cancel",
                            onPress: () => finishSetup()
                        },
                        {
                            text: "Enable",
                            onPress: async () => {
                                await LocalAuthentication.authenticateAsync();
                                await SecureStore.setItemAsync("biometric_enabled", "true");
                                finishSetup();
                            }
                        }
                    ]
                );
            } else {
                finishSetup();
            }

        } catch (error) {
            console.error("Error saving PIN:", error);
            Alert.alert("Error", "Failed to save secure PIN");
        }
    };

    const finishSetup = () => {
        ToastAndroid.show("Security setup complete!", ToastAndroid.SHORT);
        router.replace("/(tabs)");
    };

    const NumberPad = () => {
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "biometric-slot", "0", "backspace", "arrow-slot"];

        return (
            <View className="flex-row flex-wrap justify-center gap-6 mt-8 max-w-[310px]">
                {keys.map((key, index) => {
                    if (key === "biometric-slot") {
                        return (
                            <View key={key} className="w-[70px] h-[70px] items-center justify-center">
                                {step === "enter" && biometricSupported && (
                                    <TouchableOpacity
                                        onPress={handleBiometricSetup}
                                        activeOpacity={0.7}
                                        className="w-[70px] h-[70px] rounded-full  items-center justify-center border border-emerald-200"
                                    >
                                        <Fingerprint size={28} color="#059669" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }

                    if (key === "arrow-slot") {
                        return (
                            <View key={key} className="w-[70px] h-[70px] items-center justify-center mt-20">
                                {step === "enter" && pin.length === PIN_LENGTH && (
                                    <TouchableOpacity
                                        onPress={proceedToConfirm}
                                        activeOpacity={0.7}
                                        className="w-[70px] h-[70px] rounded-full bg-downy-600 items-center justify-center shadow-sm"
                                    >
                                        <ArrowRight size={24} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => handlePress(key)}
                            activeOpacity={0.7}
                            className="w-[70px] h-[70px] rounded-full bg-gray-100 items-center justify-center border border-gray-200 shadow-sm"
                        >
                            {key === "backspace" ? (
                                <Delete size={24} color="#374151" />
                            ) : (
                                <Text className="text-2xl font-semibold text-gray-900">{key}</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white">
            {/* Background Logo Watermark */}
            <View className="absolute inset-0 items-center justify-center overflow-hidden">
                <Image
                    source={require("../assets/images/chamapay-logo.png")}
                    style={{ width: '120%', height: '120%', opacity: 0.05 }}
                    resizeMode="contain"
                />
            </View>

            <View className="px-6 pt-4">
                {/* Header */}
                <TouchableOpacity
                    onPress={() => {
                        if (step === "confirm") {
                            setStep("enter");
                            setConfirmPin([]);
                        }
                    }}
                    className="mb-8"
                    activeOpacity={0.7}
                >
                    {step === "confirm" && <ArrowLeft size={24} color="#374151" />}
                </TouchableOpacity>

                <View className="items-center mb-10">
                    <View className="w-16 h-16 bg-downy-100 rounded-full items-center justify-center mb-6">
                        <ShieldCheck size={28} color="#1a6b6b" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 mb-2">
                        {step === "enter" ? "Create a PIN" : "Confirm your PIN"}
                    </Text>
                    <Text className="text-gray-500 text-center">
                        {step === "enter"
                            ? biometricSupported
                                ? "Enter a 4-digit PIN or use biometrics"
                                : "Enhance your account security with a 4-digit PIN"
                            : "Re-enter your PIN to verify"}
                    </Text>
                </View>

                <View className="items-center mb-8">
                    <View className="flex-row gap-4 mb-4">
                        {[...Array(PIN_LENGTH)].map((_, i) => {
                            const currentPin = step === "enter" ? pin : confirmPin;
                            return (
                                <View
                                    key={i}
                                    className={`w-4 h-4 rounded-full ${i < currentPin.length ? "bg-downy-700" : "bg-gray-200"
                                        }`}
                                />
                            );
                        })}
                    </View>
                </View>

                <View className="items-center">
                    <NumberPad />
                </View>
            </View>
        </View>
    );
}