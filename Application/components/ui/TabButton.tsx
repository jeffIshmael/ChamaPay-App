import { Text, TouchableOpacity, View } from "react-native";
import { Badge } from "./Badge";

export const TabButton = ({
  label,
  value,
  isActive,
  onPress,
  badge,
}: {
  label: string;
  value: string;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}) => {
  // Ensure label is always a string
  const labelText = String(label || "");
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 py-2 px-1 rounded-lg ${
        isActive ? "bg-downy-100" : "bg-gray-100"
      }`}
    >
      <View className="items-center">
        <Text
          className={`text-xs font-medium ${
            isActive ? "text-downy-700" : "text-gray-600"
          }`}
        >
          {labelText}
        </Text>
        {badge && badge > 0 && (
          <View className="absolute -top-1 -right-1">
            <Badge variant="destructive">{String(badge)}</Badge>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
