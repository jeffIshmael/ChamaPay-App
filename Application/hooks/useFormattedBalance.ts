import { useCurrencyStore } from '../store/useCurrencyStore';

/**
 * A hook to easily format and display balances based on the user's selected currency.
 * Always takes the raw USDC balance (as a number or string) and returns the formatted string
 * for display (either KES or USDC), using the platform rate.
 */
export function useFormattedBalance() {
  const { currency, platformRate } = useCurrencyStore();

  const formatBalance = (usdcBalance: number | string | undefined | null, noDecimals?: boolean) => {
    if (usdcBalance === undefined || usdcBalance === null) {
      return currency === 'KES' ? (noDecimals ? 'Ksh 0' : 'Ksh 0.00') : (noDecimals ? '0 USDC' : '0.00 USDC');
    }

    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    
    if (isNaN(numericBalance)) {
      return currency === 'KES' ? (noDecimals ? 'Ksh 0' : 'Ksh 0.00') : (noDecimals ? '0 USDC' : '0.00 USDC');
    }

    if (currency === 'KES') {
      const minFrac = noDecimals ? 0 : 2;
      const maxFrac = noDecimals ? 0 : 2;
      const kesValue = noDecimals 
        ? Math.ceil(numericBalance * platformRate)
        : Math.ceil(numericBalance * platformRate * 100) / 100;
      return ` ${kesValue.toLocaleString('en-KE', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })} KES`;
    } else {
      const minFrac = 0;
      const maxFrac = 3;
      const usdcValue = Math.ceil(numericBalance * 1000) / 1000;
      return `${usdcValue.toLocaleString('en-US', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })} USDC`;
    }
  };

  /**
   * Raw KES value getter in case components need just the number (e.g. for charts)
   */
  const getKesValue = (usdcBalance: number | string) => {
    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    if (isNaN(numericBalance)) return 0;
    return Math.ceil(numericBalance * platformRate * 100) / 100;
  };

  /**
   * Returns formatted parts for complex UI layouts
   */
  const formatBalanceParts = (usdcBalance: number | string | undefined | null, noDecimals?: boolean) => {
    if (usdcBalance === undefined || usdcBalance === null) {
      return { whole: "0", decimal: "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
    }

    const numericBalance = typeof usdcBalance === 'string' ? parseFloat(usdcBalance) : usdcBalance;
    
    if (isNaN(numericBalance)) {
      return { whole: "0", decimal: "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
    }

    let value: number;
    let minFrac: number;
    let maxFrac: number;

    if (currency === 'KES') {
      value = noDecimals 
        ? Math.ceil(numericBalance * platformRate)
        : Math.ceil(numericBalance * platformRate * 100) / 100;
      minFrac = noDecimals ? 0 : 2;
      maxFrac = noDecimals ? 0 : 2;
    } else {
      value = Math.ceil(numericBalance * 1000) / 1000;
      minFrac = 0;
      maxFrac = 3;
    }

    const formattedString = value.toLocaleString('en-US', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
    const [whole, decimal] = formattedString.split('.');
    
    return { whole, decimal: decimal || "00", symbol: currency === 'KES' ? 'KES' : 'USDC' };
  };

  return { formatBalance, formatBalanceParts, getKesValue, currency, platformRate };
}
