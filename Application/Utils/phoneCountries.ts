import type { Country } from "@/Utils/pretiumUtils";

export type { Country };

/**
 * Dial codes for phone / WhatsApp login.
 * Kenya first as default; broader than Pretium payment markets.
 */
export const PHONE_DIAL_COUNTRIES: Country[] = [
  { id: 1, code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪", phoneCode: "254" },
  { id: 2, code: "UG", name: "Uganda", currency: "UGX", flag: "🇺🇬", phoneCode: "256" },
  { id: 3, code: "TZ", name: "Tanzania", currency: "TZS", flag: "🇹🇿", phoneCode: "255" },
  { id: 4, code: "RW", name: "Rwanda", currency: "RWF", flag: "🇷🇼", phoneCode: "250" },
  { id: 5, code: "ET", name: "Ethiopia", currency: "ETB", flag: "🇪🇹", phoneCode: "251" },
  { id: 6, code: "SS", name: "South Sudan", currency: "SSP", flag: "🇸🇸", phoneCode: "211" },
  { id: 7, code: "SO", name: "Somalia", currency: "SOS", flag: "🇸🇴", phoneCode: "252" },
  { id: 8, code: "BI", name: "Burundi", currency: "BIF", flag: "🇧🇮", phoneCode: "257" },
  { id: 9, code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬", phoneCode: "234" },
  { id: 10, code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭", phoneCode: "233" },
  { id: 11, code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦", phoneCode: "27" },
  { id: 12, code: "CD", name: "DR Congo", currency: "CDF", flag: "🇨🇩", phoneCode: "243" },
  { id: 13, code: "MW", name: "Malawi", currency: "MWK", flag: "🇲🇼", phoneCode: "265" },
  { id: 14, code: "ZM", name: "Zambia", currency: "ZMW", flag: "🇿🇲", phoneCode: "260" },
  { id: 15, code: "ZW", name: "Zimbabwe", currency: "ZWL", flag: "🇿🇼", phoneCode: "263" },
  { id: 16, code: "CM", name: "Cameroon", currency: "XAF", flag: "🇨🇲", phoneCode: "237" },
  { id: 17, code: "CI", name: "Côte d'Ivoire", currency: "XOF", flag: "🇨🇮", phoneCode: "225" },
  { id: 18, code: "SN", name: "Senegal", currency: "XOF", flag: "🇸🇳", phoneCode: "221" },
  { id: 19, code: "EG", name: "Egypt", currency: "EGP", flag: "🇪🇬", phoneCode: "20" },
  { id: 20, code: "MA", name: "Morocco", currency: "MAD", flag: "🇲🇦", phoneCode: "212" },
  { id: 21, code: "AE", name: "United Arab Emirates", currency: "AED", flag: "🇦🇪", phoneCode: "971" },
  { id: 22, code: "SA", name: "Saudi Arabia", currency: "SAR", flag: "🇸🇦", phoneCode: "966" },
  { id: 23, code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧", phoneCode: "44" },
  { id: 24, code: "US", name: "United States", currency: "USD", flag: "🇺🇸", phoneCode: "1" },
  { id: 25, code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦", phoneCode: "1" },
  { id: 26, code: "IN", name: "India", currency: "INR", flag: "🇮🇳", phoneCode: "91" },
  { id: 27, code: "DE", name: "Germany", currency: "EUR", flag: "🇩🇪", phoneCode: "49" },
  { id: 28, code: "FR", name: "France", currency: "EUR", flag: "🇫🇷", phoneCode: "33" },
  { id: 29, code: "NL", name: "Netherlands", currency: "EUR", flag: "🇳🇱", phoneCode: "31" },
  { id: 30, code: "CN", name: "China", currency: "CNY", flag: "🇨🇳", phoneCode: "86" },
  { id: 31, code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺", phoneCode: "61" },
];

export const DEFAULT_PHONE_COUNTRY =
  PHONE_DIAL_COUNTRIES.find((c) => c.code === "KE") || PHONE_DIAL_COUNTRIES[0];
