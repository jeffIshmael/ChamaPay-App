import { configDotenv } from "dotenv";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";
configDotenv();
 


const thirdwebClientId = process.env.THIRDWEB_CLIENT_ID;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;



export async function testingThirdweb(){
    if(!thirdwebClientId || !thirdwebSecretKey){
        throw new Error("thirdwebClientId or thirdwebSecretKey not set.")
    }
    
    const wallet = inAppWallet();
    
    const client = createThirdwebClient({
      clientId: thirdwebClientId,
      secretKey: thirdwebSecretKey,
    });  
    console.log(wallet);
}

// Create a server wallet using thirdweb API
// The same identifier will always return the same wallet
export async function createServerWallet(identifier: string) {
  if (!thirdwebSecretKey) {
    throw new Error("THIRDWED_SECRET_KEY not set");
  }

  const response = await fetch("https://api.thirdweb.com/v1/wallets/server", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": thirdwebSecretKey,
    },
    body: JSON.stringify({ identifier }),
  });

  type ApiError = { error?: string; message?: string };
  const data = (await response.json()) as ApiError;
  if (!response.ok) {
    const message = data?.error || data?.message || "Failed to create server wallet";
    throw new Error(message);
  }
  return data;
}

// Sponsor gas on Celo by sending a small CELO amount from your server wallet
// amountWei: CELO amount in wei (string)
export async function sponsorGasOnCelo(identifier: string, recipient: string, amountWei: string) {
  if (!thirdwebSecretKey) {
    throw new Error("THIRDWED_SECRET_KEY not set");
  }

  // Ensure a deterministic server wallet exists and get its address
  const walletRes = await createServerWallet(identifier);
  const fromAddress = (walletRes as any)?.result?.address || (walletRes as any)?.address;
  if (!fromAddress) {
    throw new Error("Failed to resolve server wallet address");
  }

  const response = await fetch("https://api.thirdweb.com/v1/wallets/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": thirdwebSecretKey,
    },
    body: JSON.stringify({
      from: fromAddress,
      chainId: 42220, // Celo Mainnet
      recipients: [
        { address: recipient, quantity: amountWei },
      ],
      // Omit tokenAddress to send native CELO
    }),
  });

  type ApiError = { error?: string; message?: string };
  const data = (await response.json()) as ApiError;
  if (!response.ok) {
    const message = data?.error || data?.message || "Failed to sponsor gas on Celo";
    throw new Error(message);
  }
  return data;
}

