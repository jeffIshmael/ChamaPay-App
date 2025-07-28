import React, { FC } from "react";
import { View, Text, ScrollView } from "react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "./ui/Badge";
import { Member } from "@/constants/mockData";


type Props = {
  members: Member[];
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("");

const MembersTab: FC<Props> = ({ members }) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {members.map((member) => (
          <Card key={member.id} className="p-4">
            <View className="flex-row items-center gap-6">
              <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                <Text className="text-emerald-600 text-sm font-medium">
                  {getInitials(member.name)}
                </Text>
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-gray-900 text-sm font-medium">
                    {member.name}
                  </Text>
                  {member.role === "Admin" && (
                    <Badge variant="secondary">
                      <Text className="text-emerald-700">Admin</Text>
                    </Badge>
                  )}
                </View>
                <View className="flex-row items-center gap-3 mt-1">
                  <Text className="text-gray-600 text-xs">
                    KES {(member.contributions || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default MembersTab;
