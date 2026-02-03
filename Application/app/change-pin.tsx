import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, CheckCircle2, Delete, ShieldCheck } from "lucide-react-native";
import React, { useState } from "react";
import {
    Alert,
    Animated,
    Image,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from "react-native";

const PIN_LENGTH = 4;

type Step = "current" | "new" | "confirm";

export default function ChangePin() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("current");
    const [currentPin, setCurrentPin] = useState<string[]>([]);
    const [newPin, setNewPin] = useState<string[]>([]);
    const [confirmPin, setConfirmPin] = useState<string[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    // Animation for shake effect on error
    const shakeAnimation = new Animated.Value(0);

    const handlePress = (key: string) => {
        const pin = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
        const setPin = step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin;

        if (key === "backspace") {
            setPin((prev) => prev.slice(0, -1));
        } else if (pin.length < PIN_LENGTH) {
            const nextPin = [...pin, key];
            setPin(nextPin);

            if (nextPin.length === PIN_LENGTH) {
                processStep(nextPin);
            }
        }
    };

    const processStep = async (enteredPin: string[]) => {
        const pinStr = enteredPin.join("");

        if (step === "current") {
            const storedPin = await SecureStore.getItemAsync("user_pin");
            if (pinStr === storedPin) {
                setStep("new");
            } else {
                handleError("Incorrect current PIN");
                setCurrentPin([]);
            }
        } else if (step === "new") {
            setStep("confirm");
        } else if (step === "confirm") {
            if (pinStr === newPin.join("")) {
                saveNewPin(pinStr);
            } else {
                handleError("PINs do not match");
                setConfirmPin([]);
            }
        }
    };

    const handleError = (message: string) => {
        Vibration.vibrate(100);
        shake();
        Alert.alert("Error", message);
    };

    const saveNewPin = async (pin: string) => {
        try {
            await SecureStore.setItemAsync("user_pin", pin);
            setShowSuccess(true);
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (error) {
            console.error("Error saving PIN:", error);
            Alert.alert("Error", "Failed to update PIN");
        }
    };

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const getTitle = () => {
        switch (step) {
            case "current": return "Enter Current PIN";
            case "new": return "Enter New PIN";
            case "confirm": return "Confirm New PIN";
        }
    };

    const getSubTitle = () => {
        switch (step) {
            case "current": return "Please verify your existing PIN";
            case "new": return "Enter a 4-digit PIN for security";
            case "confirm": return "Process confirmed. Please re-enter PIN";
        }
    };

    const NumberPad = () => {
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

        return (
            <View className="flex-row flex-wrap justify-center gap-6 mt-8 max-w-[300px]">
                {keys.map((key, index) => {
                    if (key === "") return <View key={index} className="w-[70px] h-[70px]" />;

                    return (
                        <TouchableOpacity
                            key={index}
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

    if (showSuccess) {
        return (
            <View className="flex-1 bg-white items-center justify-center px-6">
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-6">
                    <CheckCircle2 size={40} color="#059669" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-2">PIN Updated</Text>
                <Text className="text-gray-500 text-center">Your security PIN has been successfully changed.</Text>
            </View>
        );
    }

    const currentPinArr = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;

    return (
        <View className="flex-1 bg-white">
            <View className="absolute inset-0 items-center justify-center overflow-hidden">
                <Image
                    source={require("../assets/images/chamapay-logo.png")}
                    style={{ width: '120%', height: '120%', opacity: 0.05 }}
                    resizeMode="contain"
                />
            </View>

            <View className="px-6 pt-12">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mb-8 w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>

                <View className="items-center mb-10">
                    <View className="w-16 h-16 bg-downy-100 rounded-full items-center justify-center mb-6">
                        <ShieldCheck size={28} color="#1a6b6b" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</Text>
                    <Text className="text-gray-500 text-center">{getSubTitle()}</Text>
                </View>

                <View className="items-center mb-8">
                    <Animated.View
                        style={{ transform: [{ translateX: shakeAnimation }] }}
                        className="flex-row gap-4 mb-4"
                    >
                        {[...Array(PIN_LENGTH)].map((_, i) => (
                            <View
                                key={i}
                                className={`w-4 h-4 rounded-full ${i < currentPinArr.length ? "bg-downy-700" : "bg-gray-200"}`}
                            />
                        ))}
                    </Animated.View>
                </View>

                <View className="items-center">
                    <NumberPad />
                </View>
            </View>
        </View>
    );
}
