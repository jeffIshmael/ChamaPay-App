import { useQuery } from "@tanstack/react-query";
import { getExchangeRate } from "@/lib/pretiumService";
import type { CurrencyCode } from "@/lib/pretiumService";

export const useExchangeRate = (currencyCode: CurrencyCode) => {
  return useQuery({
    queryKey: ["usdc-rate", currencyCode],
    queryFn: async () => await getExchangeRate(currencyCode),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });
};
