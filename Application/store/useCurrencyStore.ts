import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'USDC' | 'KES';

interface CurrencyState {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    platformRate: number;
    setPlatformRate: (rate: number) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
    persist(
        (set) => ({
            currency: 'USDC',
            setCurrency: (currency) => set({ currency }),
            platformRate: 132,
            setPlatformRate: (rate) => set({ platformRate: rate }),
        }),
        {
            name: 'currency-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
