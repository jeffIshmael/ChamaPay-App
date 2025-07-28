import { View } from "react-native";

export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <View className={`bg-white rounded-lg border border-gray-200 ${className}`}>
    {children}
  </View>
);
