import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle,
  Copy,
  Download,
  Eye,
  EyeOff,
  Shield,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

export default function WalletSetup() {
  const router = useRouter();

  const [step, setStep] = useState<"creating" | "created" | "secured">(
    "creating"
  );
  const [walletAddress] = useState(
    "0x742d35Cc6Cd3C9C4F6a8b1E2d9F7A5B3C8e4D1f6"
  );
  const [seedPhrase] = useState([
    "margin",
    "turtle",
    "abandon",
    "genuine",
    "depth",
    "science",
    "panther",
    "impact",
    "food",
    "remember",
    "coach",
    "build",
  ]);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhraseConfirmed, setSeedPhraseConfirmed] = useState(false);

  useEffect(() => {
    // Simulate wallet creation process
    const timer1 = setTimeout(() => setStep("created"), 2000);
    const timer2 = setTimeout(() => setStep("secured"), 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const copyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert("Success", "Address copied to clipboard");
  };

  const copySeedPhrase = async () => {
    await Clipboard.setStringAsync(seedPhrase.join(" "));
    Alert.alert("Success", "Seed phrase copied to clipboard");
  };

  const downloadSeedPhrase = () => {
    // In a real app, you'd use expo-file-system or similar
    Alert.alert(
      "Download Seed Phrase",
      "In a production app, this would securely save your seed phrase to your device.",
      [{ text: "OK" }]
    );
  };

  const StepIndicator = ({
    isActive,
    isCompleted,
  }: {
    isActive: boolean;
    isCompleted: boolean;
  }) => (
    <View
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: isCompleted
          ? "#059669"
          : isActive
            ? "#059669"
            : "#d1d5db",
      }}
    >
      {isActive && !isCompleted ? (
        <View
          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
          style={{ transform: [{ rotate: "0deg" }] }}
        />
      ) : isCompleted ? (
        <CheckCircle color="white" size={20} />
      ) : (
        <View className="w-3 h-3 bg-white rounded-full" />
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#ecfdf5", "#f0fdfa"]} // emerald-50 to teal-50
      className="flex-1"
    >
      <SafeAreaView className="h-full">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-8" style={{ paddingTop: 20 }}>
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: "#059669" }}
            >
              <Wallet color="white" size={32} />
            </View>
            <Text className="text-2xl mb-2 text-gray-900 font-bold text-center">
              Setting Up Your Wallet
            </Text>
            <Text className="text-gray-600 text-center">
              We&apos;re creating a secure crypto wallet for you
            </Text>
          </View>

          {/* Progress steps */}
          <View className="mb-8">
            <View className="flex-row items-center mb-6">
              <StepIndicator
                isActive={step === "creating"}
                isCompleted={step !== "creating"}
              />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-medium">
                  Creating Smart Wallet
                </Text>
                <Text className="text-sm text-gray-600">
                  Generating secure wallet infrastructure
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-6">
              <StepIndicator
                isActive={step === "created"}
                isCompleted={step === "secured"}
              />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-medium">
                  Securing Your Funds
                </Text>
                <Text className="text-sm text-gray-600">
                  Implementing multi-signature protection
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <StepIndicator
                isActive={false}
                isCompleted={step === "secured"}
              />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-medium">Ready to Use</Text>
                <Text className="text-sm text-gray-600">
                  Your wallet is ready for chama contributions
                </Text>
              </View>
            </View>
          </View>

          {step === "secured" && (
            <View className="mb-8">
              {/* Wallet Address */}
              <View
                className="bg-white rounded-2xl p-6 mb-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <View className="flex-row items-center justify-center mb-4">
                  <Shield color="#059669" size={20} />
                  <Text className="text-gray-700 ml-2 font-medium">
                    Wallet Created Successfully
                  </Text>
                </View>

                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <Text className="text-xs text-gray-600 mb-2">
                    Your Wallet Address:
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm text-gray-800 flex-1 font-mono"
                      numberOfLines={2}
                    >
                      {walletAddress}
                    </Text>
                    <TouchableOpacity
                      onPress={copyAddress}
                      className="ml-2 p-2"
                      activeOpacity={0.7}
                    >
                      <Copy color="#6b7280" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="space-y-2">
                  <Text className="text-sm text-gray-600">
                    ✓ Your wallet is secured with smart contract protection
                  </Text>
                  <Text className="text-sm text-gray-600">
                    ✓ Multi-signature security for all transactions
                  </Text>
                  <Text className="text-sm text-gray-600">
                    ✓ Automatic collateral management for public chamas
                  </Text>
                </View>
              </View>

              {/* Seed Phrase */}
              <View
                className="bg-white rounded-2xl p-6"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-gray-900 font-medium">
                    Backup Your Wallet
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowSeedPhrase(!showSeedPhrase)}
                    className="p-1"
                    activeOpacity={0.7}
                  >
                    {showSeedPhrase && (
                      <EyeOff color="#6b7280" size={16} />
                    ) }
                  </TouchableOpacity>
                </View>

                <Text className="text-sm text-gray-600 mb-4">
                  Save your seed phrase in a secure location. You&apos;ll need
                  it to recover your wallet.
                </Text>

                {showSeedPhrase ? (
                  <View>
                    <View className="bg-gray-50 rounded-lg p-4 mb-4">
                      <View className="flex-row flex-wrap">
                        {seedPhrase.map((word, index) => (
                          <View key={index} className="w-1/3 p-1">
                            <View className="bg-white rounded p-2">
                              <Text className="text-center text-sm">
                                <Text className="text-gray-500 text-xs">
                                  {index + 1}.
                                </Text>{" "}
                                {word}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View className="flex-row mb-4">
                      <TouchableOpacity
                        onPress={copySeedPhrase}
                        className="flex-1 border border-gray-300 rounded-lg py-3 mr-2 flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Copy color="#6b7280" size={16} />
                        <Text className="text-gray-700 ml-2">Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={downloadSeedPhrase}
                        className="flex-1 border border-gray-300 rounded-lg py-3 ml-2 flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Download color="#6b7280" size={16} />
                        <Text className="text-gray-700 ml-2">Download</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        setSeedPhraseConfirmed(!seedPhraseConfirmed)
                      }
                      className="flex-row items-center"
                      activeOpacity={0.7}
                    >
                      <View
                        className="w-5 h-5 rounded border-2 border-gray-300 mr-3 items-center justify-center"
                        style={{
                          backgroundColor: seedPhraseConfirmed
                            ? "#059669"
                            : "transparent",
                        }}
                      >
                        {seedPhraseConfirmed && (
                          <CheckCircle color="white" size={12} />
                        )}
                      </View>
                      <Text className="text-sm text-gray-700 flex-1">
                        I have safely stored my seed phrase
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowSeedPhrase(!showSeedPhrase)}
                    className="p-1"
                    activeOpacity={0.7}
                  >
                    <View className="bg-gray-50 rounded-lg p-8 items-center">
                      <Eye color="#9ca3af" size={20} />
                      <Text className="text-sm text-gray-600 mt-2 text-center">
                        Tap to reveal your seed phrase
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {step === "secured" && (
            <TouchableOpacity
              onPress={() => {router.push("/dashboard")}}
              disabled={!showSeedPhrase && !seedPhraseConfirmed}
              className="w-full py-4 rounded-xl items-center justify-center mb-8"
              style={{
                backgroundColor:
                  !showSeedPhrase && !seedPhraseConfirmed
                    ? "#9ca3af"
                    : "#059669",
                opacity: showSeedPhrase && !seedPhraseConfirmed ? 0.5 : 1,
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-medium text-base">
                {!seedPhraseConfirmed
                  ? "Confirm you have saved your seed phrase"
                  : "Continue to Dashboard"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
