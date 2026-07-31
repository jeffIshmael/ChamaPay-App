import React from "react";
import { View, ScrollView, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChamaDetailsLoader() {
  const insets = useSafeAreaInsets();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({
    width,
    height,
    className = "",
  }: {
    width?: string | number;
    height: number;
    className?: string;
  }) => {
    let widthValue: number | `${number}%` | "100%" = "100%";
    
    if (width !== undefined) {
      if (typeof width === "number") {
        widthValue = width;
      } else {
        widthValue = width as `${number}%`;
      }
    }

    return (
      <Animated.View
        className={`bg-gray-200 rounded-xl ${className}`}
        style={{
          width: widthValue,
          height,
          opacity: shimmerOpacity,
        }}
      />
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Status Bar Background Color Extension */}
      <View 
        className="absolute top-0 left-0 right-0 bg-downy-800 z-10"
        style={{ height: insets.top }}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header Skeleton */}
        <View
          className="bg-downy-800 pt-4 pb-8 px-6 shadow-lg rounded-b-2xl"
          style={{ paddingTop: insets.top + 16 }}
        >
          {/* Back and Share Buttons */}
          <View className="flex-row items-center justify-between mb-4">
            <SkeletonBox height={40} width={40} className="rounded-full" />
            <SkeletonBox height={40} width={40} className="rounded-full" />
          </View>

          {/* Title Row */}
          <View className="flex-row items-center gap-3 mb-3">
            <SkeletonBox height={32} width="60%" />
            <SkeletonBox height={28} width={80} className="rounded-full" />
          </View>

          {/* Description */}
          <View className="gap-2 mb-6">
            <SkeletonBox height={16} width="100%" />
            <SkeletonBox height={16} width="85%" />
          </View>

          {/* Meta Pills */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            <SkeletonBox height={36} width={100} className="rounded-full" />
            <SkeletonBox height={36} width={140} className="rounded-full" />
            <SkeletonBox height={36} width={120} className="rounded-full" />
          </View>

          {/* Progress Card */}
          <View className="bg-white/20 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <SkeletonBox height={20} width={80} />
              <SkeletonBox height={24} width={60} />
            </View>
            <SkeletonBox height={10} width="100%" className="rounded-full" />
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4">
              <SkeletonBox height={18} width="80%" className="mb-2" />
              <SkeletonBox height={22} width="60%" />
            </View>
            <View className="flex-1 bg-white rounded-2xl p-4">
              <SkeletonBox height={18} width="80%" className="mb-2" />
              <SkeletonBox height={22} width="60%" />
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View className="px-6 py-6">
          {/* Tabs Skeleton */}
          <View className="bg-gray-100 rounded-2xl p-1.5 mb-6 flex-row">
            <View className="flex-1 py-3.5 px-4 items-center justify-center">
              <SkeletonBox height={16} width={80} />
            </View>
            <View className="flex-1 py-3.5 px-4 items-center justify-center">
              <SkeletonBox height={16} width={60} />
            </View>
          </View>

          {/* How it Works Card */}
          <View className="bg-white rounded-3xl border border-gray-100 p-6 mb-5">
            <View className="flex-row items-center gap-3 mb-6">
              <SkeletonBox height={48} width={48} className="rounded-2xl" />
              <SkeletonBox height={24} width={140} />
            </View>

            {/* Steps */}
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                className="flex-row items-start gap-4 bg-gray-50 rounded-2xl p-4 mb-4"
              >
                <SkeletonBox height={56} width={56} className="rounded-2xl" />
                <View className="flex-1 pt-1">
                  <SkeletonBox height={18} width="70%" className="mb-2" />
                  <SkeletonBox height={14} width="100%" className="mb-1" />
                  <SkeletonBox height={14} width="90%" />
                </View>
              </View>
            ))}
          </View>

          {/* Financial Summary Card */}
          <View className="bg-white rounded-3xl border border-gray-100 p-6 mb-5">
            <SkeletonBox height={20} width={140} className="mb-4" />

            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-3 border-b border-gray-100"
              >
                <SkeletonBox height={14} width={120} />
                <SkeletonBox height={16} width={80} />
              </View>
            ))}
          </View>

          {/* Join Button Skeleton */}
          <View className="mt-6">
            <SkeletonBox height={56} width="100%" className="rounded-2xl" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}