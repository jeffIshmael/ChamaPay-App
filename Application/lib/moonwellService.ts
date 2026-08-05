import axios from "axios";

const MOONWELL_API_BASE = "https://api.moonwell.fi/v1";

/**
 * Fetches the real-time APY and market data for USDC on Base from Moonwell.
 */
export const getMoonwellRates = async (chain = "base", asset = "USDC") => {
  try {
    const response = await axios.get(`${MOONWELL_API_BASE}/rates?chain=${chain}&asset=${asset}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Moonwell rates:", error);
    return null;
  }
};

/**
 * Fetches the user's real-time supplied mUSDC balance.
 */
export const getMoonwellPositions = async (address: string, chain = "base") => {
  if (!address) return null;
  try {
    const response = await axios.get(`${MOONWELL_API_BASE}/positions/${address}?chain=${chain}`);
    
    // Position endpoint returns { success: true, data: [...] }. We need the Native mUSDC one.
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const usdcMarket = response.data.data.find(
        (pos: any) => pos.marketAddress && pos.marketAddress.toLowerCase() === "0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22"
      );
      if (usdcMarket) {
        return { ...usdcMarket, suppliedAmountDecimal: String(usdcMarket.suppliedUsd) };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching Moonwell positions:", error);
    return null;
  }
};
