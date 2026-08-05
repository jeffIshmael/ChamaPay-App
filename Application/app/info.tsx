import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Reusable InfoCard Component
const InfoCard = ({ title, body, bullets, footer }: { title: string, body?: string, bullets?: string[], footer?: string }) => (
    <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">{title}</Text>
        {body && (
            <Text className="text-gray-700 text-base leading-relaxed mb-2">
                {body}
            </Text>
        )}
        {bullets && bullets.length > 0 && (
            <View className="mt-1 mb-2">
                {bullets.map((bullet, idx) => (
                    <View key={idx} className="flex-row mb-3">
                        <Text className="text-gray-700 text-base mr-2">•</Text>
                        <Text className="text-gray-700 text-base leading-relaxed flex-1">
                            {bullet}
                        </Text>
                    </View>
                ))}
            </View>
        )}
        {footer && (
            <Text className="text-gray-700 text-base leading-relaxed mt-2 font-medium">
                {footer}
            </Text>
        )}
    </View>
);

export default function InfoScreen() {
    const router = useRouter();
    const { type } = useLocalSearchParams();

    let pageData = {
        title: "Information",
        lastUpdated: "August 2026",
        sections: [] as any[]
    };

    switch (type) {
        case "about":
            pageData = {
                title: "About Chamapay",
                lastUpdated: "August 2026",
                sections: [
                    {
                        title: "❤️ Saving together, made simple.",
                        body: "Chamapay is a mobile app that helps friends, families and communities manage their chamas from anywhere.\n\nInstead of manually collecting contributions, tracking payments and remembering whose turn is next, Chamapay automates the process while keeping the experience familiar.\n\nMembers can:",
                        bullets: [
                            "Create or join trusted savings groups",
                            "Deposit and withdraw using M-Pesa",
                            "Receive automatic payouts based on the group's schedule",
                            "Save idle funds and earn variable yield through Save & Earn"
                        ],
                        footer: "Whether you're saving with family, friends or colleagues, Chamapay makes managing a chama easier, more transparent and more convenient."
                    },
                    {
                        title: "🎯 Our mission",
                        body: "We're bringing Africa's tradition of saving together into the digital age.\n\nTechnology should remove the paperwork, not the trust."
                    },
                    {
                        title: "📞 Contact",
                        body: "Website\nwww.chamapay.xyz\n\nSupport\nsupport@chamapay.xyz"
                    }
                ]
            };
            break;
        case "privacy":
            pageData = {
                title: "Privacy Policy",
                lastUpdated: "August 2026",
                sections: [
                    {
                        title: "🔒 Information we collect",
                        body: "When you use Chamapay we may collect:",
                        bullets: [
                            "Name",
                            "Profile photo",
                            "Email address",
                            "Username",
                            "Wallet address created for your account",
                            "Transaction history",
                            "Device analytics"
                        ]
                    },
                    {
                        title: "🛡️ How we use your information",
                        body: "We use your information to:",
                        bullets: [
                            "Create and manage your account",
                            "Process deposits and withdrawals",
                            "Manage chama activities",
                            "Improve the app",
                            "Respond to support requests",
                            "Send important account notifications"
                        ]
                    },
                    {
                        title: "👛 Wallets",
                        body: "When you create a Chamapay account, a secure CDP wallet is automatically generated for you.\n\nThis wallet is used to facilitate transactions within Chamapay while keeping the blockchain experience simple for everyday users."
                    },
                    {
                        title: "📊 Analytics",
                        body: "We collect anonymous analytics to understand how Chamapay is used and improve reliability and performance."
                    },
                    {
                        title: "🤝 Sharing your information",
                        body: "We never sell your personal information.\n\nInformation may only be shared when necessary to:",
                        bullets: [
                            "Process payments",
                            "Provide blockchain infrastructure",
                            "Comply with legal obligations"
                        ]
                    },
                    {
                        title: "📞 Contact",
                        body: "support@chamapay.xyz"
                    }
                ]
            };
            break;
        case "terms":
            pageData = {
                title: "Terms of Service",
                lastUpdated: "August 2026",
                sections: [
                    {
                        title: "📜 Using Chamapay",
                        body: "Chamapay allows trusted groups to manage savings circles, contribute using M-Pesa, receive automated payouts and access additional savings features available within the app."
                    },
                    {
                        title: "👤 Your responsibilities",
                        body: "You agree to:",
                        bullets: [
                            "Provide accurate account information.",
                            "Keep your account secure.",
                            "Use Chamapay only for lawful purposes.",
                            "Join and create chamas with people you trust."
                        ]
                    },
                    {
                        title: "💸 Chama payouts",
                        body: "Every chama follows the contribution schedule agreed upon when it is created.\n\nIf one or more members fail to contribute before the scheduled payout:",
                        bullets: [
                            "The payout will not happen.",
                            "Contributions for that round are refunded.",
                            "The round is repeated."
                        ],
                        footer: "Chamapay does not guarantee that members will make their contributions and is not responsible for losses resulting from members failing to contribute."
                    },
                    {
                        title: "📈 Save & Earn",
                        body: "Save & Earn allows users to supply funds to supported third-party DeFi protocols.\n\nImportant:",
                        bullets: [
                            "Yield is variable.",
                            "Yield is not guaranteed.",
                            "Funds can be deposited or withdrawn at any time, subject to network conditions and protocol availability."
                        ]
                    },
                    {
                        title: "⚙️ Availability",
                        body: "We strive to keep Chamapay available at all times.\n\nOccasionally maintenance, upgrades or third-party services may temporarily affect availability."
                    },
                    {
                        title: "🔄 Changes",
                        body: "These Terms may change over time.\n\nContinued use of Chamapay means you accept the latest version."
                    },
                    {
                        title: "📞 Contact",
                        body: "support@chamapay.xyz"
                    }
                ]
            };
            break;
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
                <Text className="text-2xl font-bold text-gray-900">{pageData.title}</Text>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Last updated
                    </Text>
                    <Text className="text-sm font-bold text-gray-600 mt-1">
                        {pageData.lastUpdated}
                    </Text>
                </View>

                {pageData.sections.map((section, idx) => (
                    <InfoCard
                        key={idx}
                        title={section.title}
                        body={section.body}
                        bullets={section.bullets}
                        footer={section.footer}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}
