import React, { useEffect, useRef } from "react";
import { Animated, View, Image, Text, StyleSheet } from "react-native";

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(700),

      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish(); // notify parent that splash is done
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={require("@/assets/images/chamapay-logo.png")}
          style={styles.logo}
        />

        <Text style={styles.title}>ChamaPay</Text>
        <Text style={styles.subtitle}>Smart. Simple. Rotational Savings.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F8F7",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },
  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "700",
    color: "#0B3C49",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B6A75",
    textAlign: "center",
  },
});
