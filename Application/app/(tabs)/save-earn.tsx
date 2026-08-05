import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useExchangeRateStore } from '@/store/useExchangeRateStore';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/Utils/pretiumUtils';
import { ArrowUpRight, ShieldCheck, HandCoins, Activity, Clock, LogIn, LogOut } from 'lucide-react-native';
import { StatusBar } from "expo-status-bar";
import { getMoonwellRates, getMoonwellPositions } from '@/lib/moonwellService';
import { useAuth } from '@/Contexts/AuthContext';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const POOLS = [
  {
    id: 'moonwell',
    name: 'Moonwell',
    subtitle: 'USDC Pool',
    apy: '4.48%',
    apyValue: 4.48,
    logo: require('@/assets/images/moonwell_logo.png'),
    route: '/save-earn-pool/moonwell',
  },
];

export default function SaveAndEarnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { currency } = useCurrencyStore();
  const { fetchRate, rates } = useExchangeRateStore();
  const [moonwellApy, setMoonwellApy] = useState<number | null>(null);
  const [moonwellBalance, setMoonwellBalance] = useState(0);
  const { user } = useAuth();
  
  useEffect(() => {
    fetchRate('KES');
    getMoonwellRates().then((result) => {
      if (result && result.success && result.data && result.data.length > 0) {
        setMoonwellApy(result.data[0].baseSupplyApy);
      }
    });
    
    if (user?.smartAddress) {
      getMoonwellPositions(user.smartAddress).then((data) => {
        if (data && data.suppliedAmountDecimal) {
          setMoonwellBalance(parseFloat(data.suppliedAmountDecimal));
        }
      });
    }
  }, [user?.smartAddress]);
  
  const currentExchangeRate = rates['KES']?.data?.exchangeRate?.buying_rate || 132;
  const isKES = currency === 'KES';
  
  // Helper to format based on preferred currency
  const displayAmount = (usdcAmount: number, isPositive = false) => {
    const prefix = isPositive && usdcAmount > 0 ? '+' : '';
    if (isKES) {
      return `${prefix}KES ${formatCurrency(usdcAmount * currentExchangeRate)}`;
    }
    return `${prefix}${usdcAmount.toFixed(2)} USDC`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      
      {/* Header matching notifications (Simple & Clean) */}
      <View
        className="bg-downy-800 rounded-b-3xl px-6 pb-8 shadow-sm z-10 items-center"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Text className="text-white text-3xl font-extrabold mb-2">
          Save & Earn
        </Text>
        <Text className="text-white text-[15px] font-medium text-center px-4 leading-6">
          Grow your idle funds securely.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 mb-4 flex-row items-baseline justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Available Pools</Text>
            <Text className="text-sm font-medium text-gray-500">Earn interest on your stablecoins safely.</Text>
          </View>
        </View>

        <View className="px-5 mt-2">
          {POOLS.map((pool) => (
            <TouchableOpacity
              key={pool.id}
              onPress={() => router.push(pool.route as any)}
              activeOpacity={0.85}
              className="bg-white rounded-[32px] p-5 shadow-lg mb-4 border border-gray-100"
            >
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center flex-1">
                  <Image 
                    source={pool.logo} 
                    className="w-14 h-14 rounded-full mr-4" 
                    resizeMode="cover" 
                  />
                  <View className="flex-1 pr-2">
                    <Text className="text-xl font-bold text-gray-900">{pool.name}</Text>
                    <Text className="text-sm text-gray-500 font-medium mt-0.5">{pool.subtitle}</Text>
                  </View>
                </View>
                <View className="items-end bg-downy-50 px-3 py-2 rounded-xl">
                  <Text style={{ fontFamily: monoFont }} className="text-lg font-bold text-downy-700">
                    {pool.id === 'moonwell' && moonwellApy ? `${moonwellApy.toFixed(2)}%` : pool.apy}
                  </Text>
                  <Text className="text-[10px] font-bold text-downy-600 tracking-wide">APY</Text>
                </View>
              </View>

              {/* Tags in 3 columns */}
              <View className="flex-row justify-between gap-2 mb-6">
                <View className="flex-1 items-center justify-center bg-gray-50 py-2.5 rounded-2xl border border-gray-100">
                  <LogIn size={18} color="#10b981" className="mb-1.5" />
                  <Text className="text-[11px] font-bold text-gray-700 text-center leading-tight">Deposit{'\n'}anytime</Text>
                </View>
                <View className="flex-1 items-center justify-center bg-gray-50 py-2.5 rounded-2xl border border-gray-100">
                  <Activity size={18} color="#3b82f6" className="mb-1.5" />
                  <Text className="text-[11px] font-bold text-gray-700 text-center leading-tight">Earn{'\n'}{isKES ? 'KES' : 'USDC'}</Text>
                </View>
                <View className="flex-1 items-center justify-center bg-gray-50 py-2.5 rounded-2xl border border-gray-100">
                  <LogOut size={18} color="#f59e0b" className="mb-1.5" />
                  <Text className="text-[11px] font-bold text-gray-700 text-center leading-tight">Withdraw{'\n'}anytime</Text>
                </View>
              </View>

              {/* Balances Block */}
              <View className="bg-[#f8fafc] rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs text-gray-500 mb-1 font-medium">Invested</Text>
                  <Text style={{ fontFamily: monoFont }} className="text-[15px] font-bold text-gray-900">{displayAmount(pool.id === 'moonwell' ? moonwellBalance : 0)}</Text>
                </View>
                <View className="w-[1px] h-full bg-gray-200" />
                <View className="items-end">
                  <Text className="text-xs text-gray-500 mb-1 font-medium">Earned</Text>
                  <Text style={{ fontFamily: monoFont }} className="text-[15px] font-bold text-emerald-600">{displayAmount(0, true)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-6 mt-4">
          <Text className="text-xs text-gray-400 leading-5 text-center">
            Interest is paid by borrowers on the underlying protocol and accrues every block. Rates move with market demand and aren't guaranteed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
