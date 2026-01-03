import { Card } from "@/components/ui/Card";
import { Member } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { Crown, DollarSign, Lock, User } from "lucide-react-native";
import React, { FC } from "react";
import { ScrollView, Text, View } from "react-native";
import { toEther, toTokens } from "thirdweb/utils";

type Props = {
  members: Member[];
  eachMemberBalances?: readonly [readonly string[], readonly (readonly bigint[])[]] | null;
  isPublic?: boolean;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};


const MembersTab: FC<Props> = ({ members = [], eachMemberBalances, isPublic = false }) => {
  const {user } = useAuth();
  const totalMembers = members?.length || 0;
  const adminMembers = members?.filter(m => m && m.role === "Admin").length || 0;

  // Helper function to get member balance from blockchain data
  const getMemberBalance = (memberAddress: string) => {
    if (!eachMemberBalances || !eachMemberBalances[0] || !eachMemberBalances[1]) {
      return { balance: 0, locked: 0 };
    }
    
    const [addresses, balances] = eachMemberBalances;
    const memberIndex = addresses.findIndex(addr => addr.toLowerCase() === memberAddress.toLowerCase());
    
    if (memberIndex === -1 || !balances[memberIndex]) {
      return { balance: 0, locked: 0 };
    }
    
    const memberBalances = balances[memberIndex];
    const balance = Number(toTokens(memberBalances[0] || BigInt(0),6));
    const locked = Number(toTokens(memberBalances[1] || BigInt(0),6));
    
    return { balance, locked };
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-4">
        {/* Members Summary Card */}
        <Card className="p-6 px-2 ">
          <View className=" px-2 flex-row items-center justify-between pb-4">
            <Text className="text-lg font-semibold text-gray-900">Members</Text>
            <View className="flex-row items-center gap-2">
              <User size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600">{totalMembers} total</Text>
            </View>
          </View>
          
          {/* <View className="flex-row gap-4">
            <View className="flex-1 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <View className="flex-row items-center gap-2 mb-2">
                <User size={16} color="#059669" />
                <Text className="text-sm font-medium text-emerald-800">Total Members</Text>
              </View>
              <Text className="text-2xl font-bold text-emerald-900">{totalMembers}</Text>
            </View>
            
            <View className="flex-1 bg-purple-50 rounded-xl p-4 border border-purple-200">
              <View className="flex-row items-center gap-2 mb-2">
                <Crown size={16} color="#7c3aed" />
                <Text className="text-sm font-medium text-purple-800">Admins</Text>
              </View>
              <Text className="text-2xl font-bold text-purple-900">{adminMembers}</Text>
            </View>
          </View> */}

            {/* Members List */}
        <View className="gap-3">
          {members && members.length > 0 ? (
            members.map((member, index) => {
              if (!member) return null;
              const isCurrentUser = member.id === user?.id;
              const memberBalance = getMemberBalance(member.address || "");
              
              return (
                <Card key={member.id} className={`p-4 ${isCurrentUser ? "border-2 border-downy-400/20 bg-emerald-50" : ""}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-4 flex-1">
                      {/* Avatar */}
                      <View className={`w-12 h-12 rounded-full items-center justify-center ${
                        isCurrentUser ? "bg-emerald-500" : "bg-gray-100"
                      }`}>
                        <Text className={`text-sm font-bold ${
                          isCurrentUser ? "text-white" : "text-gray-600"
                        }`}>
                          {getInitials(member.name || "")}
                        </Text>
                      </View>
                      
                      {/* Member Info */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-2">
                          <Text className={`text-base font-semibold ${
                            isCurrentUser ? "text-emerald-600" : "text-gray-900"
                          }`}>
                            { isCurrentUser ? "# You" :`${member.name}` || "Unknown Member"}
                          </Text>
                          {member.role === "Admin" && (
                            <View className="bg-purple-100 px-2 py-1 rounded-full">
                              <View className="flex-row items-center gap-1">
                                <Crown size={10} color="#7c3aed" />
                                <Text className="text-xs font-medium text-purple-700">Admin</Text>
                              </View>
                            </View>
                          )}
                          {/* {isCurrentUser && (
                            <View className="bg-emerald-100 px-2 py-1 rounded-full">
                              <Text className="text-xs font-medium text-emerald-700">You</Text>
                            </View>
                          )} */}
                        </View>
                        
                        {/* Balance Information */}
                        <View className="gap-1">
                          {/* Available Balance */}
                          <View className="flex-row items-center gap-2">
                            <DollarSign size={14} color="#6b7280" />
                            <Text className="text-sm text-gray-600">
                              Balance: {memberBalance.balance.toLocaleString()} USDC
                            </Text>
                          </View>
                          
                          {/* Locked Balance (only for public chamas) */}
                          {isPublic && memberBalance.locked > 0 && (
                            <View className="flex-row items-center gap-2">
                              <Lock size={14} color="#f59e0b" />
                              <Text className="text-sm text-amber-600">
                                Locked: {memberBalance.locked.toLocaleString()} USDC
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card className="p-6">
              <View className="items-center">
                <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <User size={24} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 font-medium text-lg mb-2">No members yet</Text>
                <Text className="text-gray-400 text-sm text-center">
                  Members will appear here once they join the chama
                </Text>
              </View>
            </Card>
          )}
        </View>
        </Card>

      
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default MembersTab;
