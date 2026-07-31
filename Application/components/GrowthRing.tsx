import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type GrowthRingProps = {
  size?: number;
  strokeWidth?: number;
  /** 0 to 1 — position within the current accrual cycle. Purely decorative motion, ties the ring to the idea of a running cycle rather than a static badge. */
  progress?: number;
  value: string;
  label?: string;
  trackColor?: string;
  fillColor?: string;
  valueColor?: string;
  labelColor?: string;
};

/**
 * The ring is the app's signature mark: a chama is a circle of savers, so the
 * primary yield figure lives inside a circle that visibly fills rather than
 * a flat card. Requires react-native-svg (already a common Expo dependency).
 */
export function GrowthRing({
  size = 176,
  strokeWidth = 11,
  progress = 0.68,
  value,
  label = 'APY',
  trackColor = 'rgba(241,252,250,0.16)',
  fillColor = '#fbbf24',
  valueColor = '#f1fcfa',
  labelColor = '#fcd34d',
}: GrowthRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const dashOffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: valueColor, letterSpacing: -0.5 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: labelColor, letterSpacing: 2, marginTop: 2 }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
