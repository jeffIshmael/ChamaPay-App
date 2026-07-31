import { create } from 'zustand';

export type Currency = 'USDC' | 'KES';

interface CurrencyState {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
    (set) => ({
        currency: 'USDC',
        setCurrency: (currency) => set({ currency: 'USDC' }),
    })
);
