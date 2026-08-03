import { useCurrencyStore } from '../store/useCurrencyStore';

/**
 * A hook to easily format and display balances based on the user's selected currency.
 * Always takes the raw USDC balance (as a number or string) and returns the formatted string
 * for display (either KES or USDC), using the platform rate.
 */
export function useFormattedBalance() {
  const { currency, platformRate } = useCurrencyStore();

  const formatBalance = (usdcBalance: number | string | undefined | null) => {
    if (usdcBalance === undefined || usdcBalance === null) {
      return currency === 'KES' ? 'Ksh 0.00' : '0.00 USDC';
    }

    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    
    if (isNaN(numericBalance)) {
      return currency === 'KES' ? 'Ksh 0.00' : '0.00 USDC';
    }

    if (currency === 'KES') {
      const kesValue = numericBalance * platformRate;
      return ` ${kesValue.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`;
    } else {
      return `${numericBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
    }
  };

  /**
   * Raw KES value getter in case components need just the number (e.g. for charts)
   */
  const getKesValue = (usdcBalance: number | string) => {
    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    return isNaN(numericBalance) ? 0 : numericBalance * platformRate;
  };

  /**
   * Returns formatted parts for complex UI layouts
   */
  const formatBalanceParts = (usdcBalance: number | string | undefined | null) => {
    if (usdcBalance === undefined || usdcBalance === null) {
      return { whole: "0", decimal: "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
    }

    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    
    if (isNaN(numericBalance)) {
      return { whole: "0", decimal: "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
    }

    const value = currency === 'KES' ? numericBalance * platformRate : numericBalance;
    const formattedString = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [whole, decimal] = formattedString.split('.');
    
    return { whole, decimal: decimal || "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
  };

  return { formatBalance, formatBalanceParts, getKesValue, currency, platformRate };
}
