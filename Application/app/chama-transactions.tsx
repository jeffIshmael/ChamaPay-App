import { ResolvedAddress } from "@/components/ResolvedAddress";
import { Transaction } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { getRelativeTime } from "@/Utils/helperFunctions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, CornerUpRight, ExternalLink, Minus, Plus, Receipt } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, FlatList, Linking, Modal, Platform, ScrollView, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

export default function ChamaTransactions() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { transactions, chamaName } = useLocalSearchParams();
    const { user } = useAuth();
    const { formatBalance } = useFormattedBalance();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);

    const parsedTransactions: Transaction[] = typeof transactions === 'string' ? JSON.parse(transactions) : [];

    // Filter transactions
    const filteredTransactions = parsedTransactions.filter(t => {
        const searchLower = searchTerm.toLowerCase();
        return (
            t.description?.toLowerCase().includes(searchLower) ||
            t.type?.toLowerCase().includes(searchLower) ||
            t.user?.name?.toLowerCase().includes(searchLower) ||
            t.user?.address?.toLowerCase().includes(searchLower)
        );
    });

    const handleTransactionPress = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionModal(true);
    };

    const handleViewOnChain = () => {
        if (selectedTransaction?.txHash) {
            const url = `https://basescan.org/tx/${selectedTransaction.txHash}`;
            Linking.openURL(url);
        }
    };

    const handleCopyTxHash = async () => {
        if (!selectedTransaction?.txHash) return;
        await Clipboard.setStringAsync(selectedTransaction.txHash);
        if (Platform.OS === "android") {
            ToastAndroid.show("Transaction hash copied", ToastAndroid.SHORT);
        } else {
            Alert.alert("Copied", "Transaction hash copied to clipboard");
        }
    };

    const getTxTypeLabel = (tx: Transaction) => {
        if (tx.type === "payout") return "Cycle & Round Payout";
        if (tx.type === "refund") return "Payout Refunded";
        if (tx.type === "deposit_on_behalf") return tx.description || "Paid on behalf";
        return tx.description || "Transaction";
    };

    const getTxAccent = (type: string) => {
        switch (type) {
            case "payout":
                return { bg: "bg-indigo-100", color: "#4f46e5" };
            case "refund":
                return { bg: "bg-amber-100", color: "#b45309" };
            case "deposit_on_behalf":
                return { bg: "bg-teal-100", color: "#0f766e" };
            case "contribution":
                return { bg: "bg-emerald-100", color: "#059669" };
            default:
                return { bg: "bg-orange-100", color: "#ea580c" };
        }
    };

    const renderTransactionItem = ({ item: transaction }: { item: Transaction }) => {
        const isRefund = transaction.type === "refund";
        const isMyTransaction =
            !isRefund && transaction.user?.address === user?.smartAddress;

        return (
            <TouchableOpacity
                onPress={() => handleTransactionPress(transaction)}
                className={`flex-row justify-between py-3 px-4 rounded-xl mb-3 ${
                    isRefund
                        ? "bg-amber-50 border border-amber-200"
                        : transaction.type === "payout"
                            ? "bg-indigo-50 border border-indigo-200"
                            : isMyTransaction
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                                : "bg-white border border-gray-100"
                }`}
                activeOpacity={0.7}
            >
                <View className="flex-1 justify-center mr-4">
                    <Text
                        className={`text-base font-semibold capitalize mb-1 ${
                            transaction.type === "payout"
                                ? "text-indigo-600"
                                : transaction.type === "deposit_on_behalf"
                                    ? "text-teal-600"
                                    : transaction.type === "refund"
                                        ? "text-amber-700"
                                        : "text-gray-900"
                        }`}
                        numberOfLines={1}
                    >
                        {transaction.type === "payout"
                            ? "Cycle & Round Payout"
                            : transaction.type === "refund"
                                ? "Payout Refunded"
                                : transaction.description}
                    </Text>

                    {transaction.type === "payout" ? (
                        <Text className="text-xs text-gray-500" numberOfLines={1}>
                            Received by{" "}
                            <Text className="font-medium text-gray-700">
                                {transaction.user.address === user?.smartAddress
                                    ? "You"
                                    : transaction.user.name || "Member"}
                            </Text>
                        </Text>
                    ) : transaction.type === "refund" ? (
                        <Text className="text-xs text-amber-700/80" numberOfLines={1}>
                            {transaction.description}
                        </Text>
                    ) : (
                        <View className="flex-row items-center">
                            {isMyTransaction ? (
                                <Text className="text-xs font-semibold text-blue-700">You</Text>
                            ) : (
                                <ResolvedAddress
                                    address={transaction.user.address}
                                    showPrefix={false}
                                    textClassName="text-xs font-medium text-gray-700 capitalize"
                                    fallback={transaction.user.name}
                                />
                            )}
                        </View>
                    )}
                </View>

                <View className="items-end justify-center">
                    {transaction.type === "refund" ? (
                        <Text className="text-xs font-semibold text-amber-700 mb-1">
                            Refunded
                        </Text>
                    ) : (
                    <Text
                        className={`text-sm font-bold flex-row items-center mb-1 ${
                            transaction.type === "contribution" ||
                            transaction.type === "deposit_on_behalf"
                                ? "text-emerald-700"
                                : transaction.type === "payout"
                                    ? "text-purple-700"
                                    : "text-orange-700"
                        }`}
                    >
                        {transaction.type === "contribution" ||
                        transaction.type === "deposit_on_behalf" ? (
                            <Plus
                                size={12}
                                color={
                                    transaction.type === "deposit_on_behalf"
                                        ? "#0f766e"
                                        : "#059669"
                                }
                                style={{ marginRight: 2 }}
                            />
                        ) : transaction.type === "payout" ? (
                            <CornerUpRight
                                size={12}
                                color="#7c3aed"
                                style={{ marginRight: 2 }}
                            />
                        ) : (
                            <Minus size={12} color="#ea580c" style={{ marginRight: 2 }} />
                        )}
                        {formatBalance(transaction.amount || 0)}
                    </Text>
                    )}
                    <Text className="text-xs text-gray-400">
                        {getRelativeTime(transaction.date)}
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
                <View className="flex-1 justify-end bg-black/55">
                    <View className="bg-white rounded-t-3xl overflow-hidden max-h-[85%]">
                        <View className="items-center pt-3 pb-1 bg-emerald-50">
                            <View className="w-10 h-1 rounded-full bg-emerald-200" />
                        </View>

                        {selectedTransaction && (
                            <>
                                <View
                                    className="bg-emerald-50 px-5 pb-5 border-b border-emerald-100"
                                    style={{ paddingTop: 12 }}
                                >
                                    <View className="items-center">
                                        <View
                                            className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${
                                                getTxAccent(selectedTransaction.type).bg
                                            }`}
                                        >
                                            <Receipt
                                                size={26}
                                                color={getTxAccent(selectedTransaction.type).color}
                                            />
                                        </View>
                                        <Text className="text-lg font-bold text-gray-900 text-center">
                                            {getTxTypeLabel(selectedTransaction)}
                                        </Text>
                                        {selectedTransaction.type !== "refund" ? (
                                            <Text className="text-2xl font-extrabold text-downy-700 mt-1">
                                                {formatBalance(selectedTransaction.amount || 0)}
                                            </Text>
                                        ) : (
                                            <View className="mt-2 px-3 py-1 rounded-full bg-amber-100">
                                                <Text className="text-xs font-semibold text-amber-800">
                                                    Refunded
                                                </Text>
                                            </View>
                                        )}
                                        <View className="mt-2 px-2.5 py-1 rounded-full bg-white border border-emerald-100">
                                            <Text className="text-[11px] font-semibold text-emerald-700 capitalize">
                                                {selectedTransaction.status || "completed"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <ScrollView
                                    className="px-5 pt-4"
                                    showsVerticalScrollIndicator={false}
                                    bounces={false}
                                >
                                    <View className="gap-3 mb-4">
                                        <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                                            <Text className="text-xs font-semibold text-gray-500 mb-1">
                                                {selectedTransaction.type === "refund" ? "Scope" : "From"}
                                            </Text>
                                            {selectedTransaction.type === "refund" ? (
                                                <Text className="text-base font-semibold text-amber-800">
                                                    Returned to all contributing members
                                                </Text>
                                            ) : selectedTransaction.user.address === user?.smartAddress ? (
                                                <Text className="text-base font-semibold text-downy-700">
                                                    You
                                                </Text>
                                            ) : (
                                                <ResolvedAddress
                                                    address={selectedTransaction.user.address}
                                                    showPrefix={false}
                                                    textClassName="text-base font-semibold text-gray-900"
                                                    fallback={selectedTransaction.user.name}
                                                />
                                            )}
                                        </View>

                                        <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                                            <Text className="text-xs font-semibold text-gray-500 mb-1">
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
                                                    }
                                                )}
                                            </Text>
                                        </View>

                                        {selectedTransaction.txHash ? (
                                            <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                                                <Text className="text-xs font-semibold text-gray-500 mb-2">
                                                    Transaction Hash
                                                </Text>
                                                <View className="flex-row items-center">
                                                    <Text
                                                        className="flex-1 text-xs text-gray-700 font-mono mr-2"
                                                        numberOfLines={1}
                                                        ellipsizeMode="middle"
                                                    >
                                                        {selectedTransaction.txHash}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={handleCopyTxHash}
                                                        className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center"
                                                        activeOpacity={0.7}
                                                    >
                                                        <Copy size={16} color="#059669" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : null}
                                    </View>

                                    <View className="gap-3 pb-8">
                                        {selectedTransaction.txHash ? (
                                            <TouchableOpacity
                                                onPress={handleViewOnChain}
                                                className="bg-downy-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
                                                activeOpacity={0.8}
                                            >
                                                <ExternalLink size={18} color="white" />
                                                <Text className="text-white font-semibold text-base">
                                                    View on Basescan
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}

                                        <TouchableOpacity
                                            onPress={() => setShowTransactionModal(false)}
                                            className="bg-gray-100 py-3.5 rounded-2xl border border-gray-200"
                                            activeOpacity={0.8}
                                        >
                                            <Text className="text-gray-700 font-semibold text-base text-center">
                                                Close
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
