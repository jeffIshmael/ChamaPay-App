import React, { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * Ticks a live "earned so far today" figure based on principal and APY.
 * This is a client-side visual — wire it to real accrued-interest data from
 * the chain/backend once available; the math here is just simple daily
 * compounding, close enough for a live counter but not for statements.
 */
export function useLiveDailyEarnings(principal: number, apyPercent: number) {
  const [earnedToday, setEarnedToday] = useState(0);

  useEffect(() => {
    if (!principal) {
      setEarnedToday(0);
      return;
    }
    const dailyEarn = principal * (apyPercent / 100 / 365);
    const perMs = dailyEarn / (24 * 60 * 60 * 1000);
    const start = Date.now();
    const id = setInterval(() => {
      setEarnedToday((Date.now() - start) * perMs);
    }, 200);
    return () => clearInterval(id);
  }, [principal, apyPercent]);

  return earnedToday;
}

export type DailyEntry = { label: string; earned: number; balance: number };

/** Generates an illustrative daily history for a given principal + APY, for demo/empty states. Replace with real accrued-interest history once the backend exposes it. */
export function buildDailyHistory(principal: number, apyPercent: number, days = 7): DailyEntry[] {
  const dailyRate = apyPercent / 100 / 365;
  let balance = principal;
  const today = new Date();
  const out: DailyEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const earned = balance * dailyRate;
    balance += earned;
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      earned,
      balance,
    });
  }
  return out;
}

function formatUsdc(n: number, decimals = 4) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function DailyEarningsStatement({ entries }: { entries: DailyEntry[] }) {
  return (
    <View className="bg-white rounded-3xl border border-[#a3ece4] overflow-hidden">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#a3ece4]">
        <Text className="text-base font-bold text-[#09272a]">Daily earnings</Text>
        <View className="flex-row items-center">
          <TrendingUp size={14} color="#1a6b6b" />
          <Text className="text-xs font-bold text-[#1a6b6b] ml-1">Compounding daily</Text>
        </View>
      </View>

      {entries.map((entry, idx) => (
        <View
          key={entry.label + idx}
          className={`flex-row items-center justify-between px-5 py-3.5 ${
            idx !== entries.length - 1 ? 'border-b border-[#d1f6f1]' : ''
          }`}
        >
          <View>
            <Text className="text-sm font-semibold text-[#09272a]">{entry.label}</Text>
            <Text
              style={{ fontFamily: monoFont }}
              className="text-xs text-[#6b7280] mt-0.5"
            >
              Balance {formatUsdc(entry.balance, 2)} USDC
            </Text>
          </View>
          <Text
            style={{ fontFamily: monoFont }}
            className="text-sm font-bold text-[#1a6b6b]"
          >
            +{formatUsdc(entry.earned)}
          </Text>
        </View>
      ))}
    </View>
  );
}
