import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import React from "react";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function StartScreen() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push("/onboarding");
    };

    return (
        <View style={styles.container}>
            {/* Aesthetic Background Elements */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require("../assets/images/chamapay-logo.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Text Section */}
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>ChamaPay</Text>
                        <Text style={styles.subtitle}>
                            Secure, transparent, and automated circular savings for everyone.
                        </Text>
                    </View>

                    {/* Button Section */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={handleGetStarted}
                            style={styles.button}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>Get Started</Text>
                            <ArrowRight size={20} color="white" />
                        </TouchableOpacity>

                        <Text style={styles.footerText}>
                            Empowering communities through digital finance.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    safeArea: {
        flex: 1,
    },
    circle1: {
        position: "absolute",
        top: -height * 0.1,
        right: -width * 0.2,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: (width * 0.8) / 2,
        backgroundColor: "#d1f6f1", // downy-100
        opacity: 0.6,
    },
    circle2: {
        position: "absolute",
        bottom: -height * 0.05,
        left: -width * 0.1,
        width: width * 0.5,
        height: width * 0.5,
        borderRadius: (width * 0.5) / 2,
        backgroundColor: "#a3ece4", // downy-200
        opacity: 0.4,
    },
    content: {
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    logoContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 180,
        height: 180,
        shadowColor: "#26a6a2",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    textContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    title: {
        fontSize: 48,
        fontWeight: "900",
        color: "#1a1a1a",
        marginBottom: 16,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        color: "#4b5563",
        textAlign: "center",
        lineHeight: 26,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: "100%",
        alignItems: "center",
    },
    button: {
        backgroundColor: "#26a6a2", // downy-500
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 20,
        width: "100%",
        shadowColor: "#26a6a2",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        marginRight: 12,
    },
    footerText: {
        marginTop: 24,
        fontSize: 14,
        color: "#9ca3af",
        textAlign: "center",
    },
});
