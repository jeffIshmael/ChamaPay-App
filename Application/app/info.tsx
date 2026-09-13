import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type Section = {
  title: string;
  body?: string;
  bullets?: string[];
  footer?: string;
};

const InfoCard = ({
  title,
  body,
  bullets,
  footer,
  index,
}: Section & { index: number }) => (
  <View className="mb-5 bg-white rounded-2xl overflow-hidden border border-gray-100">
    <View className="flex-row">
      <View className="w-1 bg-downy-500" />
      <View className="flex-1 p-5">
        <View className="flex-row items-center mb-3">
          <View className="w-7 h-7 rounded-full bg-downy-100 items-center justify-center mr-2.5">
            <Text className="text-downy-700 text-xs font-bold">{index + 1}</Text>
          </View>
          <Text className="text-lg font-bold text-gray-900 flex-1">{title}</Text>
        </View>

        {body ? (
          <Text className="text-gray-600 text-[15px] leading-6 mb-2">{body}</Text>
        ) : null}

        {bullets && bullets.length > 0 ? (
          <View className="mt-1 mb-1">
            {bullets.map((bullet, idx) => (
              <View key={idx} className="flex-row mb-2.5 items-start">
                <View className="w-1.5 h-1.5 rounded-full bg-downy-500 mt-2 mr-3" />
                <Text className="text-gray-700 text-[15px] leading-6 flex-1">
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {footer ? (
          <Text className="text-gray-800 text-[15px] leading-6 mt-2 font-medium">
            {footer}
          </Text>
        ) : null}
      </View>
    </View>
  </View>
);

export default function InfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams();

  let pageData: { title: string; lastUpdated: string; sections: Section[] } = {
    title: "Information",
    lastUpdated: "August 2026",
    sections: [],
  };

  switch (type) {
    case "about":
      pageData = {
        title: "About Chamapay",
        lastUpdated: "August 2026",
        sections: [
          {
            title: "Saving together, made simple",
            body: "Chamapay is a mobile app that helps friends, families and communities manage their chamas from anywhere.\n\nInstead of manually collecting contributions, tracking payments and remembering whose turn is next, Chamapay automates the process while keeping the experience familiar.\n\nMembers can:",
            bullets: [
              "Create or join trusted savings groups",
              "Deposit and withdraw using M-Pesa",
              "Receive automatic payouts based on the group's schedule",
              "Save idle funds and earn variable yield through Save & Earn",
            ],
            footer:
              "Whether you're saving with family, friends or colleagues, Chamapay makes managing a chama easier, more transparent and more convenient.",
          },
          {
            title: "Our mission",
            body: "We're bringing Africa's tradition of saving together into the digital age.\n\nTechnology should remove the paperwork, not the trust.",
          },
          {
            title: "Contact",
            body: "Website\nwww.chamapay.xyz\n\nSupport\nsupport@chamapay.xyz",
          },
        ],
      };
      break;
    case "privacy":
      pageData = {
        title: "Privacy Policy",
        lastUpdated: "August 2026",
        sections: [
          {
            title: "Information we collect",
            body: "When you use Chamapay we may collect:",
            bullets: [
              "Name",
              "Profile photo",
              "Email address",
              "Username",
              "Wallet address created for your account",
              "Transaction history",
              "Device analytics",
            ],
          },
          {
            title: "How we use your information",
            body: "We use your information to:",
            bullets: [
              "Create and manage your account",
              "Process deposits and withdrawals",
              "Manage chama activities",
              "Improve the app",
              "Respond to support requests",
              "Send important account notifications",
            ],
          },
          {
            title: "Wallets",
            body: "When you create a Chamapay account, a secure CDP wallet is automatically generated for you.\n\nThis wallet is used to facilitate transactions within Chamapay while keeping the blockchain experience simple for everyday users.",
          },
          {
            title: "Analytics",
            body: "We collect anonymous analytics to understand how Chamapay is used and improve reliability and performance.",
          },
          {
            title: "Sharing your information",
            body: "We never sell your personal information.\n\nInformation may only be shared when necessary to:",
            bullets: [
              "Process payments",
              "Provide blockchain infrastructure",
              "Comply with legal obligations",
            ],
          },
          {
            title: "Contact",
            body: "support@chamapay.xyz",
          },
        ],
      };
      break;
    case "terms":
      pageData = {
        title: "Terms of Service",
        lastUpdated: "August 2026",
        sections: [
          {
            title: "Using Chamapay",
            body: "Chamapay allows trusted groups to manage savings circles, contribute using M-Pesa, receive automated payouts and access additional savings features available within the app.",
          },
          {
            title: "Your responsibilities",
            body: "You agree to:",
            bullets: [
              "Provide accurate account information.",
              "Keep your account secure.",
              "Use Chamapay only for lawful purposes.",
              "Join and create chamas with people you trust.",
            ],
          },
          {
            title: "Chama payouts",
            body: "Every chama follows the contribution schedule agreed upon when it is created.\n\nIf one or more members fail to contribute before the scheduled payout:",
            bullets: [
              "The payout will not happen.",
              "Contributions for that round are refunded.",
              "The round is repeated.",
            ],
            footer:
              "Chamapay does not guarantee that members will make their contributions and is not responsible for losses resulting from members failing to contribute.",
          },
          {
            title: "Save & Earn",
            body: "Save & Earn lets you supply funds to supported third-party lending pools (such as Moonwell).\n\nImportant:",
            bullets: [
              "You earn interest paid by borrowers. Rates are variable and not guaranteed.",
              "Your money stays yours, but others may borrow from the same pool.",
              "You can withdraw only when the pool has free cash (money not currently borrowed).",
              "If the pool is fully borrowed, withdrawals pause until cash returns; your deposit remains safe and keeps earning.",
            ],
          },
          {
            title: "Availability",
            body: "We strive to keep Chamapay available at all times.\n\nOccasionally maintenance, upgrades or third-party services may temporarily affect availability.",
          },
          {
            title: "Changes",
            body: "These Terms may change over time.\n\nContinued use of Chamapay means you accept the latest version.",
          },
          {
            title: "Contact",
            body: "support@chamapay.xyz",
          },
        ],
      };
      break;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />

      <View
        className="bg-downy-800 rounded-b-3xl px-5 pb-6 shadow-sm z-10"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-1 items-center px-3">
            <Text className="text-white text-xl font-bold text-center">
              {pageData.title}
            </Text>
            <Text className="text-white/70 text-xs mt-1 font-medium">
              Last updated {pageData.lastUpdated}
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {pageData.sections.map((section, idx) => (
          <InfoCard
            key={idx}
            index={idx}
            title={section.title}
            body={section.body}
            bullets={section.bullets}
            footer={section.footer}
          />
        ))}
      </ScrollView>
    </View>
  );
}
