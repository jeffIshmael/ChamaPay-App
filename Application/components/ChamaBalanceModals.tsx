import { useAuth } from "@/Contexts/AuthContext";
import { CheckCircle, Lock, Wallet } from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { addLockedFundsToChama, withdrawFromChamaBalance } from "../lib/userService";

interface WithdrawModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    chamaId: number;
    chamaName: string;
    balance: number;
    currency: string;
}

export const WithdrawModal = ({
    visible,
    onClose,
    onSuccess,
    chamaId,
    chamaName,
    balance,
    currency,
}: WithdrawModalProps) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const { token } = useAuth();

    const handleWithdraw = async () => {
        setLoading(true);
        setError("");

        try {
            const withdrawAmount = Number(amount);
            if (!withdrawAmount || withdrawAmount <= 0 || isNaN(withdrawAmount)) {
                setError("Please enter a valid amount");
                setLoading(false);
                return;
            }

            if (withdrawAmount > balance) {
                setError(
                    `Insufficient balance. You have ${balance.toFixed(3)} ${currency} available`
                );
                setLoading(false);
                return;
            }

            const result = await withdrawFromChamaBalance(chamaId, amount, token!);
            if (result.success) {
                setIsSuccess(true);
            } else {
                setError("Failed to process withdrawal. Please try again.");
            }
        } catch (error) {
            console.error("Withdraw error:", error);
            setError("Failed to process withdrawal. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!isSuccess) {
            setAmount("");
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <TouchableOpacity
                    className="flex-1"
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-lg max-h-[70vh]">
                    <View className="w-10 h-1 bg-gray-300 rounded self-center mb-4" />

                    {isSuccess ? (
                        <View className="items-center py-6">
                            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                                <CheckCircle size={40} color="#059669" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                                Withdrawal Successful!
                            </Text>
                            <Text className="text-gray-600 text-center mb-8 px-4">
                                Successfully withdrawn {amount} {currency} from {chamaName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsSuccess(false);
                                    setAmount("");
                                    onSuccess();
                                }}
                                className="w-full bg-downy-800 py-4 rounded-xl shadow-md"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-center text-lg">
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <View className="flex-row items-center mb-6">
                                <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mr-4">
                                    <Wallet size={24} color="#059669" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-semibold text-gray-900">
                                        Withdraw Balance
                                    </Text>
                                    <Text className="text-xs text-gray-500">From {chamaName}</Text>
                                </View>
                            </View>

                            <View className="w-full">
                                <View className="mb-4">
                                    <Text className="text-sm text-gray-700 mb-2 font-medium">
                                        Amount ({currency})
                                    </Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={amount}
                                        onChangeText={(text) => {
                                            setAmount(text);
                                            setError("");
                                        }}
                                    />
                                    {error ? (
                                        <Text className="text-red-500 text-xs mt-2">{error}</Text>
                                    ) : null}
                                </View>

                                <View className="bg-gray-50 p-4 rounded-xl mb-6">
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="text-gray-600 text-sm">Available Balance</Text>
                                        <Text className="text-gray-900 font-bold">
                                            {balance.toFixed(3)} {currency}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setAmount(balance.toString())}
                                        className="self-end"
                                    >
                                        <Text className="text-emerald-600 text-xs font-bold">Withdraw All</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className={`py-4 rounded-xl shadow-md ${loading ? "bg-gray-400" : "bg-downy-800"
                                        }`}
                                    onPress={handleWithdraw}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-center text-lg">
                                            Confirm Withdrawal
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

interface AddLockedFundsModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    chamaId: number;
    chamaName: string;
    currency: string;
}

export const AddLockedFundsModal = ({
    visible,
    onClose,
    onSuccess,
    chamaId,
    chamaName,
    currency,
}: AddLockedFundsModalProps) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [isOnramp, setIsOnramp] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const { token } = useAuth();

    const handleAddFunds = async () => {
        setLoading(true);
        setError("");

        try {
            const lockAmount = Number(amount);
            if (!lockAmount || lockAmount <= 0 || isNaN(lockAmount)) {
                setError("Please enter a valid amount");
                setLoading(false);
                return;
            }

            const result = await addLockedFundsToChama(chamaId, amount, isOnramp, token!);
            if (result.success) {
                setIsSuccess(true);
            } else {
                setError("Failed to add locked funds. Please try again.");
            }
        } catch (error) {
            console.error("Add locked funds error:", error);
            setError("Failed to add locked funds. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!isSuccess) {
            setAmount("");
            setIsOnramp(false);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <TouchableOpacity
                    className="flex-1"
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-lg max-h-[80vh]">
                    <View className="w-10 h-1 bg-gray-300 rounded self-center mb-4" />

                    {isSuccess ? (
                        <View className="items-center py-6">
                            <View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center mb-6">
                                <CheckCircle size={40} color="#7c3aed" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                                Collateral Added!
                            </Text>
                            <Text className="text-gray-600 text-center mb-8 px-4">
                                Successfully added {amount} {currency} as locked funds to {chamaName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsSuccess(false);
                                    setAmount("");
                                    onSuccess();
                                }}
                                className="w-full bg-purple-600 py-4 rounded-xl shadow-md"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-center text-lg">
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <View className="flex-row items-center mb-6">
                                <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mr-4">
                                    <Lock size={24} color="#7c3aed" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-semibold text-gray-900">
                                        Add Collateral
                                    </Text>
                                    <Text className="text-xs text-gray-500">Lock funds for {chamaName}</Text>
                                </View>
                            </View>

                            <View className="w-full">
                                <View className="mb-4">
                                    <Text className="text-sm text-gray-700 mb-2 font-medium">
                                        Amount ({currency})
                                    </Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={amount}
                                        onChangeText={(text) => {
                                            setAmount(text);
                                            setError("");
                                        }}
                                    />
                                    {error ? (
                                        <Text className="text-red-500 text-xs mt-2">{error}</Text>
                                    ) : null}
                                </View>

                                {/* Onramp Toggle */}
                                <View className="mb-6">
                                    <Text className="text-sm text-gray-700 mb-3 font-medium">
                                        Payment Method
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => setIsOnramp(false)}
                                            className={`flex-1 p-3 rounded-xl border ${!isOnramp ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"}`}
                                        >
                                            <Text className={`text-center font-semibold ${!isOnramp ? "text-purple-700" : "text-gray-600"}`}>Direct Balance</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setIsOnramp(true)}
                                            className={`flex-1 p-3 rounded-xl border ${isOnramp ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"}`}
                                        >
                                            <Text className={`text-center font-semibold ${isOnramp ? "text-purple-700" : "text-gray-600"}`}>Service Agent</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text className="text-[10px] text-gray-500 mt-2 px-1">
                                        {isOnramp
                                            ? "The agent will handle the onchain deposit for you. Recommended for bank/mobile money users."
                                            : "Deducts directly from your connected smart wallet balance."}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    className={`py-4 rounded-xl shadow-md ${loading ? "bg-gray-400" : "bg-purple-600"
                                        }`}
                                    onPress={handleAddFunds}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-center text-lg">
                                            Lock Funds
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};
