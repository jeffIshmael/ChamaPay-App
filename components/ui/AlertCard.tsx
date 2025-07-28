import { View } from "react-native";

export const AlertCard = ({
  children,
  type = "warning",
}: {
  children: React.ReactNode;
  type?: "warning" | "error";
}) => (
  <View
    className={`rounded-lg border p-4 ${
      type === "warning"
        ? "border-orange-200 bg-orange-50"
        : "border-red-200 bg-red-50"
    }`}
  >
    {children}
  </View>
);
