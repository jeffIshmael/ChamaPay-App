// File: lib/pretiumUtils.ts or utils/pretiumUtils.ts
// Pretium API data structures and utilities

export interface Country {
  id: number;
  code: string;
  name: string;
  currency: string;
  flag: string;
  phoneCode: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "mobile_money" | "bank";
  logo?: any; // Add logo imports when available
}

export interface Bank {
  id: string;
  name: string;
  code: number | string;
}

export interface TransactionLimits {
  min: number;
  max: number;
  currency: string;
}

// All supported countries based on Pretium docs
export const PRETIUM_COUNTRIES: Country[] = [
  {
    id: 1,
    code: "KE",
    name: "Kenya",
    currency: "KES",
    flag: "🇰🇪",
    phoneCode: "254",
  },
  {
    id: 2,
    code: "UG",
    name: "Uganda",
    currency: "UGX",
    flag: "🇺🇬",
    phoneCode: "256",
  },
  {
    id: 3,
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    flag: "🇳🇬",
    phoneCode: "234",
  },
  {
    id: 4,
    code: "MWK",
    name: "Malawi",
    currency: "MWK",
    flag: "🇲🇼",
    phoneCode: "265",
  },
  {
    id: 5,
    code: "GH",
    name: "Ghana",
    currency: "GHS",
    flag: "🇬🇭",
    phoneCode: "233",
  },
  {
    id: 9,
    code: "CDF",
    name: "DR Congo",
    currency: "CDF",
    flag: "🇨🇩",
    phoneCode: "243",
  },

  {
    id: 10,
    code: "ETB",
    name: "Ethiopia",
    currency: "ETB",
    flag: "🇪🇹",
    phoneCode: "251",
  },

  {
    id: 1111,
    code: "ROW",
    name: "Rest of the World",
    currency: "USD",
    flag: "🌍",
    phoneCode: "1",
  },
];

// Payment methods per country based on Pretium documentation
export const PRETIUM_PAYMENT_METHODS: Record<string, PaymentMethod[]> = {
  KE: [
    {
      id: "Safaricom",
      name: "M-Pesa (Safaricom)",
      type: "mobile_money",
      logo: require("@/assets/images/mpesa.png"),
    },
    {
      id: "Airtel",
      name: "Airtel Money",
      type: "mobile_money",
      logo: require("@/assets/images/Airtel-logo.jpg"),
    },
    { id: "bank", name: "Bank Transfer", type: "bank" },
  ],
  CDF: [
    {
      id: "Airtel",
      name: "Airtel Money",
      type: "mobile_money",
      logo: require("@/assets/images/Airtel-logo.jpg"),
    },
    {
      id: "Safaricom",
      name: "M-Pesa (Safaricom)",
      type: "mobile_money",
      logo: require("@/assets/images/mpesa.png"),
    },
    {
      id: "Orange Money",
      name: "Orange Money",
      type: "mobile_money",
      logo: require("@/assets/images/orange-money.png"),
    },
  ],
  UG: [
    {
      id: "MTN",
      name: "MTN Mobile Money",
      type: "mobile_money",
      logo: require("@/assets/images/mtn-yellow-logo.png"),
    },
    {
      id: "Airtel",
      name: "Airtel Money",
      type: "mobile_money",
      logo: require("@/assets/images/Airtel-logo.jpg"),
    },
  ],
  ETB: [
    {
      id: "Telebirr",
      name: "Telebirr",
      type: "mobile_money",
      logo: require("@/assets/images/Telebirr.png"),
    },
    {
      id: "CBE Birr",
      name: "CBE Birr",
      type: "mobile_money",
      logo: require("@/assets/images/cbe.webp"),
    },
    {
      id: "Safaricom",
      name: "M-Pesa (Safaricom)",
      type: "mobile_money",
      logo: require("@/assets/images/mpesa.png"),
    },
  ],
  MWK: [
    {
      id: "Airtel",
      name: "Airtel Money",
      type: "mobile_money",
      logo: require("@/assets/images/Airtel-logo.jpg"),
    },
    {
      id: "TNM",
      name: "TNM Mpamba",
      type: "mobile_money",
      logo: require("@/assets/images/tnm.png"),
    },
  ],
  NG: [{ id: "bank", name: "Bank Transfer", type: "bank" }],
  GH: [
    {
      id: "MTN",
      name: "MTN Mobile Money",
      type: "mobile_money",
      logo: require("@/assets/images/mtn-yellow-logo.png"),
    },
    {
      id: "AirtelTigo",
      name: "AirtelTigo Money",
      type: "mobile_money",
      logo: require("@/assets/images/airteltigo-money.webp"),
    },
    {
      id: "Telecel",
      name: "Telecel Cash",
      type: "mobile_money",
      logo: require("@/assets/images/telecel.png"),
    },
  ],
};

// Banks per country - Replace with actual Pretium API call
export const PRETIUM_BANKS: Record<string, Bank[]> = {
  KE: [
    { id: "equity", name: "Equity Bank", code: 247247 },
    { id: "kcb", name: "KCB Bank", code: 522522 },
    { id: "coop", name: "Co-operative Bank", code: 400200 },
    { id: "absa", name: "Absa Bank", code: 303030 },
    { id: "ncba", name: "NCBA Bank", code: 880100 },
    { id: "stanbic", name: "Stanbic Bank", code: 600100 },
    { id: "scb", name: "Standard Chartered", code: 329329 },
    { id: "dtb", name: "Diamond Trust Bank (DTB)", code: 516600 },
    { id: "national", name: "National Bank", code: 547700 },
    { id: "sbm", name: "SBM Bank Kenya", code: 552800 },
    { id: "i&m", name: "I & M Bank", code: 542542 },
  ],
  NG: [
    { id: "palmpay", name: "PalmPay", code: "100033" },
    { id: "opay", name: "Opay", code: "100004" },
    { id: "moniepoint", name: "Moniepoint Microfinance Bank", code: "090405" },
    { id: "gtbank", name: "Guaranty Trust Bank", code: "058" },
    { id: "access", name: "Access Bank", code: "044" },
    { id: "zenith", name: "Zenith Bank PLC", code: "057" },
    { id: "uba", name: "United Bank for Africa", code: "033" },
    { id: "first", name: "First Bank", code: "011" },
    { id: "union", name: "Union Bank PLC", code: "032" },
    { id: "sterling", name: "Sterling Bank PLC", code: "232" },
    { id: "fidelity", name: "Fidelity Bank", code: "070" },
    { id: "ecobank", name: "EcoBank PLC", code: "050" },
    { id: "wema", name: "Wema Bank PLC", code: "035" },
  ],
};

// limit of transaction
export const PRETIUM_TRANSACTION_LIMIT: Record<string, TransactionLimits> = {
  KE: {
    min: 20,
    max: 250000,
    currency: "KES",
  },
  CDF: {
    min: 2800,
    max: 280000,
    currency: "CDF",
  },
  UG: {
    min: 500,
    max: 5000000,
    currency: "UGX",
  },
  ETB: {
    min: 10,
    max: 100000,
    currency: "ETB",
  },
  MWK: {
    min: 100,
    max: 5000000,
    currency: "MWK",
  },
  NG: {
    min: 100,
    max: 1000000,
    currency: "NGN",
  },
  GH: {
    min: 5,
    max: 5000,
    currency: "GHS",
  },
};

// Utility function: Get payment methods for a country
export const getPaymentMethodsForCountry = (
  countryCode: string
): PaymentMethod[] => {
  return PRETIUM_PAYMENT_METHODS[countryCode] || [];
};

// Utility function: Get banks for a country
export const getBanksForCountry = (countryCode: string): Bank[] => {
  return PRETIUM_BANKS[countryCode] || [];
};

// Utility function: Get country by code
export const getCountryByCode = (code: string): Country | undefined => {
  return PRETIUM_COUNTRIES.find((country) => country.code === code);
};

// Utility function: Format phone number for display
export const formatPhoneNumber = (
  phoneCode: string,
  phoneNumber: string
): string => {
  return `+${phoneCode}${phoneNumber}`;
};

// Utility function: Validate phone number length (basic validation)
export const isValidPhoneNumber = (
  phoneNumber: string,
  minLength: number = 9
): boolean => {
  const cleaned = phoneNumber.replace(/[^0-9]/g, "");
  return cleaned.length >= minLength;
};

// Utility function: Calculate fee (0.5% of total)
export const calculateWithdrawalFee = (
  totalAmount: number,
  feePercentage: number = 0.005
): number => {
  return totalAmount * feePercentage;
};

// Utility function: Calculate final amount after fee
export const calculateFinalAmount = (
  totalAmount: number,
  feePercentage: number = 0.005
): number => {
  const fee = calculateWithdrawalFee(totalAmount, feePercentage);
  return totalAmount - fee;
};

// Utility function: Format number with commas and decimals
export const formatCurrency = (
  value: string | number,
  decimals: number = 2
): string => {
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
  return methods.some((method) => method.type === "bank");
};

// Utility function: Check if country supports mobile money
export const supportsMobileMoney = (countryCode: string): boolean => {
  const methods = getPaymentMethodsForCountry(countryCode);
  return methods.some((method) => method.type === "mobile_money");
};

// Utility function: Get processing time text
export const getProcessingTimeText = (
  paymentType: "mobile_money" | "bank"
): string => {
  return paymentType === "mobile_money"
    ? "Funds will be sent instantly"
    : "Processing takes 1-3 business days";
};

// function to get the min and max
export const getTransactionLimit = (countryCode: string): TransactionLimits => {
  return PRETIUM_TRANSACTION_LIMIT[countryCode];
};

// TODO: Replace these with actual Pretium API calls
// export const fetchCountriesFromPretium = async () => { ... }
// export const fetchPaymentMethodsFromPretium = async (countryCode: string) => { ... }
// export const fetchBanksFromPretium = async (countryCode: string) => { ... }
