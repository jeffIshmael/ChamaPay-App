// File: lib/pretiumUtils.ts or utils/pretiumUtils.ts
// Pretium API data structures and utilities

export interface Country {
    code: string;
    name: string;
    currency: string;
    flag: string;
    phoneCode: string;
  }
  
  export interface PaymentMethod {
    id: string;
    name: string;
    type: 'mobile_money' | 'bank';
    logo?: any; // Add logo imports when available
  }
  
  export interface Bank {
    id: string;
    name: string;
  }
  
  // All supported countries based on Pretium docs
  export const PRETIUM_COUNTRIES: Country[] = [
    { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪', phoneCode: '254' },
    { code: 'UG', name: 'Uganda', currency: 'UGX', flag: '🇺🇬', phoneCode: '256' },
    { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬', phoneCode: '234' },
    { code: 'CDF', name: 'DR Congo', currency: 'CDF', flag: '🇨🇩', phoneCode: '243' },
    { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭', phoneCode: '233' },
    { code: 'ETB', name: 'Ethiopia', currency: 'ETB', flag: '🇪🇹', phoneCode: '251' },
    { code: 'MWK', name: 'Malawi', currency: 'MWK', flag: '🇲🇼', phoneCode: '265' },
  ];
  
  // Payment methods per country based on Pretium documentation
  export const PRETIUM_PAYMENT_METHODS: Record<string, PaymentMethod[]> = {
    KE: [
      { id: 'safaricom', name: 'M-Pesa (Safaricom)', type: 'mobile_money' },
      { id: 'airtel', name: 'Airtel Money', type: 'mobile_money' },
      { id: 'bank', name: 'Bank Transfer', type: 'bank' },
    ],
    CDF: [
      { id: 'airtel', name: 'Airtel Money', type: 'mobile_money' },
      { id: 'mpesa', name: 'M-Pesa', type: 'mobile_money' },
      { id: 'orange', name: 'Orange Money', type: 'mobile_money' },
    ],
    UG: [
      { id: 'mtn', name: 'MTN Mobile Money', type: 'mobile_money' },
      { id: 'airtel', name: 'Airtel Money', type: 'mobile_money' },
    ],
    ETB: [
      { id: 'telebirr', name: 'Telebirr', type: 'mobile_money' },
      { id: 'cbe', name: 'CBE Birr', type: 'mobile_money' },
      { id: 'mpesa', name: 'M-Pesa', type: 'mobile_money' },
    ],
    MWK: [
      { id: 'airtel', name: 'Airtel Money', type: 'mobile_money' },
      { id: 'tnm', name: 'TNM Mpamba', type: 'mobile_money' },
    ],
    NG: [
      { id: 'bank', name: 'Bank Transfer', type: 'bank' },
    ],
    GH: [
      { id: 'mtn', name: 'MTN Mobile Money', type: 'mobile_money' },
      { id: 'airteltigo', name: 'AirtelTigo Money', type: 'mobile_money' },
      { id: 'telecel', name: 'Telecel Cash', type: 'mobile_money' },
    ],
  };
  
  // Banks per country - Replace with actual Pretium API call
  export const PRETIUM_BANKS: Record<string, Bank[]> = {
    KE: [
      { id: 'equity', name: 'Equity Bank' },
      { id: 'kcb', name: 'KCB Bank' },
      { id: 'coop', name: 'Co-operative Bank' },
      { id: 'absa', name: 'Absa Bank' },
      { id: 'ncba', name: 'NCBA Bank' },
      { id: 'stanbic', name: 'Stanbic Bank' },
      { id: 'scb', name: 'Standard Chartered' },
      { id: 'dtb', name: 'Diamond Trust Bank' },
      { id: 'family', name: 'Family Bank' },
      { id: 'im', name: 'I&M Bank' },
    ],
    NG: [
      { id: 'gtbank', name: 'GTBank' },
      { id: 'access', name: 'Access Bank' },
      { id: 'zenith', name: 'Zenith Bank' },
      { id: 'uba', name: 'UBA' },
      { id: 'first', name: 'First Bank' },
      { id: 'union', name: 'Union Bank' },
      { id: 'sterling', name: 'Sterling Bank' },
      { id: 'fidelity', name: 'Fidelity Bank' },
      { id: 'ecobank', name: 'Ecobank' },
      { id: 'wema', name: 'Wema Bank' },
    ],
  };
  
  // Utility function: Get payment methods for a country
  export const getPaymentMethodsForCountry = (countryCode: string): PaymentMethod[] => {
    return PRETIUM_PAYMENT_METHODS[countryCode] || [];
  };
  
  // Utility function: Get banks for a country
  export const getBanksForCountry = (countryCode: string): Bank[] => {
    return PRETIUM_BANKS[countryCode] || [];
  };
  
  // Utility function: Get country by code
  export const getCountryByCode = (code: string): Country | undefined => {
    return PRETIUM_COUNTRIES.find(country => country.code === code);
  };
  
  // Utility function: Format phone number for display
  export const formatPhoneNumber = (phoneCode: string, phoneNumber: string): string => {
    return `+${phoneCode}${phoneNumber}`;
  };
  
  // Utility function: Validate phone number length (basic validation)
  export const isValidPhoneNumber = (phoneNumber: string, minLength: number = 9): boolean => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    return cleaned.length >= minLength;
  };
  
  // Utility function: Calculate fee (0.5% of total)
  export const calculateWithdrawalFee = (totalAmount: number, feePercentage: number = 0.005): number => {
    return totalAmount * feePercentage;
  };
  
  // Utility function: Calculate final amount after fee
  export const calculateFinalAmount = (totalAmount: number, feePercentage: number = 0.005): number => {
    const fee = calculateWithdrawalFee(totalAmount, feePercentage);
    return totalAmount - fee;
  };
  
  // Utility function: Format number with commas and decimals
  export const formatCurrency = (value: string | number, decimals: number = 2): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
  
  // Utility function: Check if country supports bank transfers
  export const supportsBankTransfer = (countryCode: string): boolean => {
    const methods = getPaymentMethodsForCountry(countryCode);
    return methods.some(method => method.type === 'bank');
  };
  
  // Utility function: Check if country supports mobile money
  export const supportsMobileMoney = (countryCode: string): boolean => {
    const methods = getPaymentMethodsForCountry(countryCode);
    return methods.some(method => method.type === 'mobile_money');
  };
  
  // Utility function: Get processing time text
  export const getProcessingTimeText = (paymentType: 'mobile_money' | 'bank'): string => {
    return paymentType === 'mobile_money' 
      ? 'Funds will be sent instantly' 
      : 'Processing takes 1-3 business days';
  };
  
  // TODO: Replace these with actual Pretium API calls
  // export const fetchCountriesFromPretium = async () => { ... }
  // export const fetchPaymentMethodsFromPretium = async (countryCode: string) => { ... }
  // export const fetchBanksFromPretium = async (countryCode: string) => { ... }