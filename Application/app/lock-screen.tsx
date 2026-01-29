import { useAuth } from "@/Contexts/AuthContext";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Delete, Fingerprint } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const PIN_LENGTH = 4;

export default function LockScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [pin, setPin] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);

    // Animation for shake effect on error
    const shakeAnimation = new Animated.Value(0);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(compatible && enrolled);

        if (compatible && enrolled) {
            authenticateWithBiometrics();
        }
    };

    const authenticateWithBiometrics = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Unlock ChamaPay",
                fallbackLabel: "Use PIN",
            });

            if (result.success) {
                unlockApp();
            }
        } catch (error) {
            console.log("Biometric auth failed", error);
        }
    };

    const handlePress = (key: string) => {
        if (loading) return;
        if (key === "backspace") {
            setPin((prev) => prev.slice(0, -1));
        } else if (pin.length < PIN_LENGTH) {
            const newPin = [...pin, key];
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                verifyPin(newPin.join(""));
            }
        }
    };

    const verifyPin = async (enteredPin: string) => {
        setLoading(true);
        try {
            const storedPin = await SecureStore.getItemAsync("user_pin");

            if (storedPin === enteredPin) {
                unlockApp();
            } else {
                shake();
                setPin([]);
                Alert.alert("Incorrect PIN", "Please try again.");
            }
        } catch (error) {
            console.error("Error verifying PIN:", error);
            Alert.alert("Error", "Could not verify PIN");
        } finally {
            setLoading(false);
        }
    };

    const unlockApp = () => {
        // Navigate back to the main app
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
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

    const NumberPad = () => {
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "biometric-slot", "0", "backspace"];

        return (
            <View className="flex-row flex-wrap justify-center gap-6 mt-8 max-w-[300px]">
                {keys.map((key, index) => {
                    if (key === "biometric-slot") {
                        return (
                            <View key={key} className="w-[70px] h-[70px] items-center justify-center">
                                {biometricSupported && (
                                    <TouchableOpacity
                                        onPress={authenticateWithBiometrics}
                                        activeOpacity={0.6}
                                        className="w-[70px] h-[70px] rounded-full items-center justify-center"
                                    >
                                        <Fingerprint size={32} color="#059669" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )
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
            <View className="absolute inset-0 items-center justify-center overflow-hidden">
                <Image
                    source={require("../assets/images/chamapay-logo.png")}
                    style={{ width: '120%', height: '120%', opacity: 0.05 }}
                    resizeMode="contain"
                />
            </View>

            <View className="flex-1 items-center justify-center px-6">
                <Image
                    source={require("../assets/images/chamapay-logo.png")}
                    className="w-24 h-24 mb-6"
                />

                <Text className="text-gray-500 font-medium mb-10">
                    Enter PIN to unlock
                </Text>

                <Animated.View
                    style={{ transform: [{ translateX: shakeAnimation }] }}
                    className="flex-row gap-4 mb-10"
                >
                    {[...Array(PIN_LENGTH)].map((_, i) => (
                        <View
                            key={i}
                            className={`w-4 h-4 rounded-full ${i < pin.length ? "bg-downy-700" : "bg-gray-200"
                                }`}
                        />
                    ))}
                </Animated.View>

                <NumberPad />
            </View>
        </View>
    );
}