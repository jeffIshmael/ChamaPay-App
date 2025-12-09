// this file has the mpesa functions to the server
import { serverUrl } from "@/constants/serverUrl";

export const sendMpesaStkPush = async (
  phoneNo: number,
  amount: string,
  token: string
) => {
  try {
    const response = await fetch(`${serverUrl}/mpesa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, phoneNo }),
    });
    const data = await response.json();
    console.log("the data from server", data);
    return data;
  } catch (error) {
    console.error("Error adding member to chama:", error);
    return { success: false, error: "Failed to add member to chama" };
  }
};
