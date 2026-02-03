import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Currency = 'USDC' | 'KES';

interface CurrencyState {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
    persist(
        (set) => ({
            currency: 'KES', // Default to KES
            setCurrency: (currency) => set({ currency }),
        }),
        {
            name: 'currency-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
