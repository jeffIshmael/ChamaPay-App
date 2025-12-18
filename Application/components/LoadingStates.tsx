import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  View,
} from "react-native";

// Beautiful Loading State Component
export const ChamaDetailsLoadingState = () => {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Skeleton */}
      <SafeAreaView className="bg-downy-800 rounded-b-2xl">
        <View className="p-6 pb-4">
          {/* Top bar with back button */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="w-10 h-10 bg-white/20 rounded-full" />
            <View className="flex-1 items-center mx-4">
              <View className="bg-white/20 rounded-lg h-6 w-32 mb-2" />
              <View className="bg-white/10 rounded-full h-5 w-20" />
            </View>
            <View className="w-10 h-10 bg-white/20 rounded-full" />
          </View>

          {/* Stats Row */}
          <View className="flex-row justify-between mt-2">
            {[1, 2, 3].map((i) => (
              <View key={i} className="items-center">
                <View className="bg-emerald-100/20 rounded h-4 w-20 mb-2" />
                <View className="bg-white/30 rounded h-6 w-12" />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* Tabs Skeleton */}
      <View className="px-6 pt-4">
        <View className="flex-row bg-gray-200 rounded-lg p-1 mb-4 h-12">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-1 bg-gray-300 rounded-md mx-0.5" />
          ))}
        </View>

        {/* Content Skeleton */}
        <View className="gap-4">
          {/* Card 1 */}
          <View className="bg-white p-5 rounded-2xl shadow-sm">
            <View className="bg-gray-200 h-5 w-32 rounded mb-4" />
            <View className="bg-gray-100 h-32 rounded-xl mb-3" />
            <View className="flex-row justify-between">
              <View className="bg-gray-200 h-4 w-24 rounded" />
              <View className="bg-gray-200 h-4 w-16 rounded" />
            </View>
          </View>

          {/* Card 2 */}
          <View className="bg-white p-5 rounded-2xl shadow-sm">
            <View className="bg-gray-200 h-5 w-40 rounded mb-4" />
            <View className="gap-3">
              {[1, 2].map((i) => (
                <View key={i} className="flex-row items-center">
                  <View className="w-12 h-12 bg-gray-200 rounded-full mr-3" />
                  <View className="flex-1">
                    <View className="bg-gray-200 h-4 w-32 rounded mb-2" />
                    <View className="bg-gray-100 h-3 w-24 rounded" />
                  </View>
                  <View className="bg-gray-200 h-8 w-16 rounded-lg" />
                </View>
              ))}
            </View>
          </View>

          {/* Card 3 */}
          <View className="bg-white p-5 rounded-2xl shadow-sm">
            <View className="bg-gray-200 h-5 w-36 rounded mb-4" />
            <View className="gap-2">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="flex-row justify-between items-center py-2"
                >
                  <View className="bg-gray-200 h-4 w-40 rounded" />
                  <View className="bg-gray-100 h-4 w-20 rounded" />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Loading Indicator Overlay */}
      {/* <View className="absolute inset-0 items-center justify-center bg-white/30 backdrop-blur-sm">
          <View className="bg-white rounded-3xl p-8 shadow-2xl items-center">
            <ActivityIndicator size="large" color="#059669" />
            <Text className="text-lg font-semibold text-gray-900 mt-4">
              Loading Chama Details
            </Text>
            <Text className="text-sm text-gray-500 mt-2">
              Please wait...
            </Text>
          </View>
        </View> */}
    </View>
  );
};

// Error State Component
export const ChamaDetailsErrorState = ({
  message = "Chama not found",
  onRetry,
  onClose,
}: {
  message?: string;
  onRetry?: () => void;
  onClose: () => void;
}) => {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-6">
      <View className="bg-white rounded-3xl p-8 shadow-lg items-center max-w-sm w-full">
        {/* Error Icon */}
        <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
          <Text className="text-4xl">⚠️</Text>
        </View>

        {/* Error Message */}
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
          Oops!
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          {message}
        </Text>

        {/* Retry Button */}
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            className="bg-downy-600 px-8 py-3 rounded-xl w-full"
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-center text-base">
              Try Again
            </Text>
          </TouchableOpacity>
        )}

        {/* Go Back Button */}
        <TouchableOpacity
          onPress={() => onClose()}
          className="bg-gray-200 px-8 py-3 rounded-xl w-full mt-3"
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 font-semibold text-center text-base">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
