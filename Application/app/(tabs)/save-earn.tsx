import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useExchangeRateStore } from '@/store/useExchangeRateStore';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { formatCurrency } from '@/Utils/pretiumUtils';
import { ArrowUpRight, ShieldCheck, HandCoins, Activity, Clock, LogIn, LogOut } from 'lucide-react-native';
import { StatusBar } from "expo-status-bar";
import { getMoonwellUsdcSnapshot, type MoonwellUsdcSnapshot, computeMoonwellPrincipalUsdc } from '@/lib/moonwellService';
import { getTheUserTx } from '@/lib/walletServices';
import { useAuth } from '@/Contexts/AuthContext';
import { useFormattedBalance } from '@/hooks/useFormattedBalance';
import MoonwellInfoButton from '@/components/MoonwellInfoButton';
import MoonwellWithdrawStatus from '@/components/MoonwellWithdrawStatus';

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

  const { currency, platformRate } = useCurrencyStore();
  const { getKesValue } = useFormattedBalance();
  const { fetchRate } = useExchangeRateStore();
  const [moonwellSnapshot, setMoonwellSnapshot] = useState<MoonwellUsdcSnapshot | null>(null);
  const [moonwellLoading, setMoonwellLoading] = useState(true);
  const { user, token } = useAuth();
  
  useFocusEffect(
    useCallback(() => {
      fetchRate('KES');

      const loadMoonwell = async () => {
        if (!user?.smartAddress) {
          setMoonwellSnapshot(null);
          setMoonwellLoading(false);
          return;
        }

        setMoonwellLoading(true);
        try {
          let principal = 0;
          if (token) {
            const txRes = await getTheUserTx(token, { limit: 100 });
            const moonwellTxs =
              txRes?.transactions.filter(
                (tx) =>
                  tx.rawReceiver === 'Moonwell' ||
                  tx.rawSender === 'Moonwell' ||
                  tx.description?.includes('Moonwell')
              ) ?? [];
            principal = computeMoonwellPrincipalUsdc(moonwellTxs);
          }

          const snapshot = await getMoonwellUsdcSnapshot(
            user.smartAddress,
            principal,
            "base",
            platformRate,
            token
          );
          setMoonwellSnapshot(snapshot);
        } catch {
          setMoonwellSnapshot(null);
        } finally {
          setMoonwellLoading(false);
        }
      };

      loadMoonwell();
    }, [user?.smartAddress, token, platformRate])
  );
  
  const isKES = currency === 'KES';
  
  const apyNum = moonwellSnapshot?.supplyApy ?? 0;
  
  // Helper to format based on preferred currency
  const displayAmount = (usdcAmount: number, isPositive = false) => {
    const prefix = isPositive && usdcAmount > 0 ? '+' : '';
    if (isKES) {
      return `${prefix}KES ${formatCurrency(getKesValue(usdcAmount), 2)}`;
    }
    return `${prefix}${usdcAmount.toFixed(3)} USDC`;
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
                    <View className="flex-row items-center">
                      <Text className="text-xl font-bold text-gray-900">{pool.name}</Text>
                      {pool.id === 'moonwell' ? (
                        <View className="ml-1.5">
                          <MoonwellInfoButton
                            size={17}
                            color="#6b7280"
                            currentApy={moonwellSnapshot?.supplyApy}
                          />
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-sm text-gray-500 font-medium mt-0.5">{pool.subtitle}</Text>
                  </View>
                </View>
                <View className="items-end bg-downy-50 px-3 py-2 rounded-xl">
                  {pool.id === 'moonwell' && moonwellLoading ? (
                    <View className="h-6 w-14 bg-downy-200/50 rounded-md mb-1 mt-0.5" />
                  ) : (
                    <Text style={{ fontFamily: monoFont }} className="text-lg font-bold text-downy-700">
                      {pool.id === 'moonwell' && moonwellSnapshot?.supplyApy != null
                        ? `${moonwellSnapshot.supplyApy.toFixed(2)}%`
                        : pool.apy}
                    </Text>
                  )}
                  <Text className="text-[10px] font-bold text-downy-600 tracking-wide">APY</Text>
                </View>
              </View>

              {/* Tags in 3 columns */}
              <View className="flex-row justify-between gap-2 mb-4">
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
                  <Text className="text-[11px] font-bold text-gray-700 text-center leading-tight">Withdraw{'\n'}when funded</Text>
                </View>
              </View>

              {pool.id === 'moonwell' ? (
                <View className="mb-4">
                  <MoonwellWithdrawStatus
                    liquidityUsd={moonwellSnapshot?.liquidityUsd}
                    loading={moonwellLoading}
                    variant="full"
                  />
                </View>
              ) : null}

              {/* Balances Block */}
              <View className="bg-[#f8fafc] rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs text-gray-500 mb-1 font-medium">Invested</Text>
                  {pool.id === 'moonwell' && moonwellLoading ? (
                    <View className="h-5 w-20 bg-gray-200 rounded-md" />
                  ) : (
                    <Text style={{ fontFamily: monoFont }} className="text-[15px] font-bold text-gray-900">
                      {displayAmount(
                        pool.id === 'moonwell'
                          ? (moonwellSnapshot?.principalUsdc ?? 0)
                          : 0
                      )}
                    </Text>
                  )}
                </View>
                <View className="w-[1px] h-full bg-gray-200" />
                <View className="items-end">
                  <Text className="text-xs text-gray-500 mb-1 font-medium">Earned</Text>
                  {pool.id === 'moonwell' && moonwellLoading ? (
                    <View className="h-5 w-16 bg-gray-200 rounded-md" />
                  ) : (
                    <Text style={{ fontFamily: monoFont }} className="text-[15px] font-bold text-emerald-600">
                      {displayAmount(
                        pool.id === 'moonwell'
                          ? (moonwellSnapshot?.earnedUsdc ?? 0)
                          : 0,
                        true
                      )}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-6 mt-4">
          <Text className="text-xs text-gray-400 leading-5 text-center">
            Interest is paid by borrowers on the underlying protocol and accrues every block. Rates move with market demand and aren't guaranteed. You can withdraw anytime when the pool has free money (liquidity).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
