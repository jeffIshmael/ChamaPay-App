import { ResolvedAddress } from "@/components/ResolvedAddress";
import { Transaction } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { getRelativeTime } from "@/Utils/helperFunctions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ExternalLink, Minus, Plus, Receipt, Search } from "lucide-react-native"; // ReceiptIcon is not in lucide-react-native, using Receipt
import React, { useState } from "react";
import { FlatList, Linking, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChamaTransactions() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { transactions, chamaName } = useLocalSearchParams();
    const { user } = useAuth();
    const { rates } = useExchangeRateStore();
    const kesRate = rates["KES"]?.rate || 0;

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);

    const parsedTransactions: Transaction[] = typeof transactions === 'string' ? JSON.parse(transactions) : [];

    // Filter transactions
    const filteredTransactions = parsedTransactions.filter(t => {
        const searchLower = searchTerm.toLowerCase();
        return (
            t.description.toLowerCase().includes(searchLower) ||
            t.user.name.toLowerCase().includes(searchLower) ||
            t.user.address.toLowerCase().includes(searchLower)
        );
    });

    const handleTransactionPress = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionModal(true);
    };

    const handleViewOnChain = () => {
        if (selectedTransaction?.txHash) {
            const url = `https://celoscan.io/tx/${selectedTransaction.txHash}`;
            Linking.openURL(url);
        }
    };

    const renderTransactionItem = ({ item: transaction }: { item: Transaction }) => {
        const isMyTransaction = transaction.user.address === user?.smartAddress;
        const currency = "USDC"; // Assuming USDC as default base currency from context

        return (
            <TouchableOpacity
                onPress={() => handleTransactionPress(transaction)}
                className={`flex-row items-center justify-between py-3 px-4 rounded-xl mb-3 ${isMyTransaction
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                    : "bg-white border border-gray-100"
                    }`}
                activeOpacity={0.7}
            >
                <View className="flex-row items-center gap-2 flex-1">
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-base font-medium text-gray-900 capitalize" numberOfLines={1}>
                                {isMyTransaction ? (
                                    <Text className="font-bold text-blue-700">You</Text>
                                ) : (
                                    <ResolvedAddress
                                        address={transaction.user.address}
                                        showPrefix={false}
                                        textClassName="text-base font-medium text-gray-900 capitalize"
                                        fallback={transaction.user.name}
                                    />
                                )}{" "}
                                {transaction.description}
                            </Text>
                        </View>
                        <Text className="text-xs text-gray-500 mt-1">
                            {getRelativeTime(transaction.date)}
                        </Text>
                    </View>
                </View>

                <View className="items-end pl-2">
                    <Text className="text-sm font-semibold text-emerald-700 flex-row items-center">
                        {transaction.type === "contribution" ? (
                            <Plus size={14} color="#059669" style={{ marginRight: 2 }} />
                        ) : (
                            <Minus size={14} color="#ea580c" style={{ marginRight: 2 }} />
                        )}
                        {kesRate > 0 && user?.location === "KE"
                            ? `  ${(Number(transaction.amount) * kesRate).toFixed(2)} KES`
                            : `  ${(transaction.amount || 0).toString()} ${currency}`}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View
                className="bg-downy-700 px-6 pb-4 border-b border-gray-100 rounded-b-2xl"
                style={{ paddingTop: insets.top }}
            >
                <View className="flex-row items-center gap-4 mb-2 mt-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                    >
                        <ArrowLeft size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-white">All Transactions</Text>
                        <Text className="text-sm text-gray-200">{chamaName} chama</Text>
                    </View>
                </View>
            </View>

            {/* Transactions List */}
            <FlatList
                data={filteredTransactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                            <Receipt size={32} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-500 font-medium text-lg">No transactions found</Text>

                        <Text className="text-gray-400 text-sm mt-1">Transactions will appear here</Text>


                    </View>
                }
            />

            {/* Transaction Details Modal */}
            <Modal
                visible={showTransactionModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTransactionModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
                        <View className="w-10 h-1 bg-gray-300 rounded self-center mb-6" />

                        {selectedTransaction && (
                            <>
                                <View className="items-center mb-6">
                                    <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-4">
                                        <Receipt size={32} color="#059669" />
                                    </View>
                                    <Text className="text-xl font-bold text-gray-900 mb-2">
                                        Transaction Details
                                    </Text>
                                    <Text className="text-sm text-gray-600 text-center px-4">
                                        {selectedTransaction.description}
                                    </Text>
                                </View>

                                <View className="space-y-4 mb-6">
                                    <View className="bg-gray-50 rounded-xl p-4">
                                        <Text className="text-sm text-gray-500 mb-1">Amount</Text>
                                        <Text className="text-2xl font-bold text-gray-900">
                                            {kesRate > 0 && user?.location === "KE"
                                                ? `${(parseFloat(selectedTransaction.amount?.toString() || "0") * kesRate).toFixed(2)} KES`
                                                : `${parseFloat(selectedTransaction.amount?.toString() || "0").toLocaleString()} USDC`}
                                        </Text>
                                        {kesRate > 0 && user?.location === "KE" && (
                                            <Text className="text-sm font-medium text-gray-400 mt-1">
                                                ≈ {parseFloat(selectedTransaction.amount?.toString() || "0").toFixed(2)} USDC
                                            </Text>
                                        )}
                                    </View>

                                    <View className="bg-gray-50 rounded-xl p-4">
                                        <Text className="text-sm text-gray-500 mb-1">From</Text>
                                        <Text className="text-base font-semibold text-gray-900">
                                            {selectedTransaction.user.address === user?.smartAddress ? (
                                                <Text className="font-semibold text-gray-900">You</Text>
                                            ) : (
                                                <ResolvedAddress
                                                    address={selectedTransaction.user.address}
                                                    showPrefix={false}
                                                    textClassName="font-semibold text-gray-900"
                                                    fallback={selectedTransaction.user.name}
                                                />
                                            )}
                                        </Text>
                                    </View>

                                    <View className="bg-gray-50 rounded-xl p-4">
                                        <Text className="text-sm text-gray-500 mb-1">
                                            Date & Time
                                        </Text>
                                        <Text className="text-base font-semibold text-gray-900">
                                            {new Date(selectedTransaction.date).toLocaleDateString(
                                                "en-US",
                                                {
                                                    weekday: "short",
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: false
                                                }
                                            )}
                                        </Text>
                                    </View>

                                    <View className="bg-gray-50 rounded-xl p-4">
                                        <Text className="text-sm text-gray-500 mb-1">
                                            Transaction Hash
                                        </Text>
                                        <Text
                                            className="text-xs text-gray-700 font-mono"
                                            numberOfLines={1}
                                            ellipsizeMode="middle"
                                        >
                                            {selectedTransaction.txHash}
                                        </Text>
                                    </View>
                                </View>

                                <View className="gap-3">
                                    <TouchableOpacity
                                        onPress={handleViewOnChain}
                                        className="bg-emerald-600 py-4 rounded-xl flex-row items-center justify-center gap-2"
                                        activeOpacity={0.8}
                                    >
                                        <ExternalLink size={18} color="white" />
                                        <Text className="text-white font-semibold text-base">
                                            View on Chain
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setShowTransactionModal(false)}
                                        className="bg-gray-100 py-4 rounded-xl border border-gray-300"
                                        activeOpacity={0.8}
                                    >
                                        <Text className="text-gray-700 font-semibold text-base text-center">
                                            Close
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
