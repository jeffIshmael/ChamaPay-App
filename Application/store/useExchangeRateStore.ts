import { CurrencyCode, getExchangeRate } from '@/lib/pretiumService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Quote {
    currencyCode: CurrencyCode;
    exchangeRate: { buying_rate: number; selling_rate: number };
    success: boolean;
    error?: string;
}

interface ExchangeRateData {
    rate: number;
    data: Quote;
    updatedAt: number;
}

interface ExchangeRateState {
    rates: Record<string, ExchangeRateData>;
    loading: Record<string, boolean>;
    error: Record<string, string | null>;

    fetchRate: (currencyCode: CurrencyCode) => Promise<ExchangeRateData | null>;
    getRate: (currencyCode: CurrencyCode) => ExchangeRateData | null;
    hydrate: () => Promise<void>;
}

const TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

export const useExchangeRateStore = create<ExchangeRateState>()(
    persist(
        (set, get) => ({
            rates: {},
            loading: {},
            error: {},

            getRate: (currencyCode) => {
                return get().rates[currencyCode] || null;
            },

            fetchRate: async (currencyCode) => {
                const state = get();
                const cached = state.rates[currencyCode];
                const now = Date.now();

                // Check if loading for this currency already
                if (state.loading[currencyCode]) {
                    // Wait for current fetch? Simplified: just return cached if exists, otherwise null
                    return cached || null;
                }

                // Check TTL: If cached and within TTL, return cached
                if (cached && (now - cached.updatedAt) < TTL) {
                    return cached;
                }

                set((state) => ({
                    loading: { ...state.loading, [currencyCode]: true },
                    error: { ...state.error, [currencyCode]: null },
                }));

                try {
                    const result = await getExchangeRate(currencyCode);
                    if (result && result.success && result.exchangeRate) {
                        const newData: ExchangeRateData = {
                            rate: result.exchangeRate.selling_rate,
                            data: result,
                            updatedAt: now,
                        };

                        set((state) => ({
                            rates: { ...state.rates, [currencyCode]: newData },
                            loading: { ...state.loading, [currencyCode]: false },
                        }));

                        return newData;
                    } else {
                        throw new Error(result?.error || 'Failed to fetch rate');
                    }
                } catch (err: any) {
                    console.error(`Error fetching rate for ${currencyCode}:`, err);

                    set((state) => ({
                        loading: { ...state.loading, [currencyCode]: false },
                        error: { ...state.error, [currencyCode]: err.message || 'Unknown error' },
                    }));

                    // Fallback to cached value (even if expired) if network fails
                    return cached || null;
                }
            },

            hydrate: async () => {
                // Zustand persist handles hydration automatically from storage.
                // We can use this method to trigger pre-fetching if needed.
                console.log('Exchange rate store hydrated');
            },
        }),
        {
            name: 'exchange-rate-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist the rates, not loading/error states
            partialize: (state) => ({ rates: state.rates }),
        }
    )
);
