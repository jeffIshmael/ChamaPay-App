import { Text, View } from "react-native";

export const Badge = ({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive";
  className?: string;
}) => {
  const baseClasses = "px-2 py-1 rounded-full";
  const variantClasses = {
    default: "bg-gray-900 text-white",
    secondary: "bg-gray-100 text-gray-700",
    destructive: "bg-red-500 text-white",
  };

  return (
    <View className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <Text
        className={`text-[8px] font-medium ${variant === "default" ? "text-white" : variant === "destructive" ? "text-white" : "text-gray-700"}`}
      >
        {children}
      </Text>
    </View>
  );
};
