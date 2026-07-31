import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InfoScreen() {
    const router = useRouter();
    const { type } = useLocalSearchParams();

    let title = "";
    let content = "";

    switch (type) {
        case "privacy":
            title = "Privacy Policy";
            content = `At ChamaPay, your privacy is our priority. We are committed to protecting your personal information and ensuring your experience is secure.\n\n1. Information Collection\nWe collect information to provide better services to all our users. This includes basic details like your username and email, as well as onchain wallet addresses used for transactions.\n\n2. Use of Information\nWe use the information we collect to operate, maintain, and improve our app, as well as to communicate with you about updates or support inquiries.\n\n3. Data Security\nWe implement robust security measures to protect your data. Your wallet's seed phrase is never stored on our servers and remains completely under your control.\n\n4. Third-Party Sharing\nWe do not sell your personal data. We only share information with trusted third parties necessary for processing transactions or complying with legal obligations.\n\nFor more details, please contact our support team.`;
            break;
        case "terms":
            title = "Terms of Service";
            content = `Welcome to ChamaPay! By using our app, you agree to these terms.\n\n1. Acceptance of Terms\nBy creating an account or using ChamaPay, you agree to be bound by these Terms of Service.\n\n2. User Responsibilities\nYou are responsible for maintaining the confidentiality of your account credentials, including your PIN and seed phrase. You agree to notify us immediately of any unauthorized use of your account.\n\n3. Financial Transactions\nChamaPay facilitates onchain transactions. You acknowledge that blockchain transactions are irreversible and that ChamaPay is not responsible for lost funds due to user error or compromised credentials.\n\n4. Termination\nWe reserve the right to suspend or terminate your account at any time for violations of these terms.\n\n5. Modifications\nWe may update these terms from time to time. Continued use of the app constitutes acceptance of any changes.`;
            break;
        case "about":
            title = "About ChamaPay";
            content = `ChamaPay is a revolutionary decentralized application (dApp) designed to bring the traditional African concept of "Chamas" (savings groups) to the blockchain.\n\nOur Mission\nWe aim to empower communities by providing a secure, transparent, and easy-to-use platform for group savings and investments using stablecoins and blockchain technology.\n\nWhy ChamaPay?\nTraditional savings groups often suffer from a lack of transparency and security. By leveraging smart contracts on the blockchain, ChamaPay ensures that all contributions are securely locked and automatically distributed according to the group's predefined rules, eliminating the need for trust in a single central authority.\n\nBuilt for the Future\nWe are constantly innovating to bring you the best features in decentralized finance, making group savings accessible to everyone, everywhere.`;
            break;
        default:
            title = "Information";
            content = "No information available.";
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center px-6 py-4 border-b border-gray-100 bg-white">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4"
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={20} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">{title}</Text>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-12">
                    <Text className="text-gray-700 text-base leading-relaxed">
                        {content}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
