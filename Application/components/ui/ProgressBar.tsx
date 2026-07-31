import { View } from "react-native";

export const ProgressBar = ({ value }: { value: number }) => (
  <View className="w-full h-2 bg-gray-200 rounded-full">
    <View
      className="h-full bg-emerald-500 rounded-full"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </View>
);
