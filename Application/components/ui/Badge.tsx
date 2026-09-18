import React from "react";
import { Text, View } from "react-native";

export const Badge = ({
  children,
  variant = "default",
  className = "",
  color,
  bg,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive";
  className?: string;
  /** Text color when using custom palette */
  color?: string;
  /** Background color when using custom palette */
  bg?: string;
}) => {
  const baseClasses = "px-2 py-1 rounded-full";
  const variantClasses = {
    default: "bg-gray-900",
    secondary: "bg-gray-100",
    destructive: "bg-red-500",
  };

  const custom = Boolean(color || bg);
  const textColor = color
    ? undefined
    : variant === "secondary"
      ? "#374151"
      : "#ffffff";

  return (
    <View
      className={`${baseClasses} ${custom ? "" : variantClasses[variant]} ${className}`}
      style={custom ? { backgroundColor: bg || "#f3f4f6" } : undefined}
    >
      <Text
        className="text-[8px] font-medium"
        style={{ color: color || textColor }}
      >
        {children}
      </Text>
    </View>
  );
};
