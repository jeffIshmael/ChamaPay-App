import { serverUrl } from "@/constants/serverUrl";

export type CurrencyCode = "KES" | "UGX" | "CDF" | "MWK" | "ETB" | "GHS";

// function to onramp through pretium
// note: amount should be plus the additional fee
export async function pretiumOnramp(
  phoneNo: string,
  amount: number,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/onramp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        phoneNo,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
  }
}

// function to get the quote
export async function getExchangeRate(currencyCode: CurrencyCode) {
  try {
    const response = await fetch(`${serverUrl}/pretium/quote/${currencyCode}`, {
      method: "GET",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
  }
}
