import axios from "axios";

/**
 * Add a user's smart address to the Alchemy webhook
 * This allows the webhook to monitor USDC transfers to this address
 */
export const addAddressToWebhook = async (
    address: string,
): Promise<boolean> => {
    try {
        const token = process.env.ALCHEMY_TOKEN;
        const webhookId = process.env.ALCHEMY_WEBHOOK_ID;

        if (!token) {
            console.error("ALCHEMY_TOKEN not configured");
            return false;
        }

        if (!webhookId) {
            console.error("ALCHEMY_WEBHOOK_ID not configured");
            return false;
        }

        const response = await axios.patch(
            "https://dashboard.alchemy.com/api/update-webhook-addresses",
            {
                webhook_id: webhookId,
                addresses_to_add: [address.toLowerCase()],
                addresses_to_remove: [],
            },
            {
                headers: {
                    "X-Alchemy-Token": token,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Successfully added address ${address} to Alchemy webhook`);
        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Alchemy API Error:", error.response?.data || error.message);
        } else {
            console.error("Error adding address to Alchemy webhook:", error);
        }
        return false;
    }
};

/**
 * Remove a user's smart address from the Alchemy webhook
 * Useful when a user deletes their account
 */
export const removeAddressFromWebhook = async (
    address: string,
): Promise<boolean> => {
    try {
        const token = process.env.ALCHEMY_TOKEN;
        const webhookId = process.env.ALCHEMY_WEBHOOK_ID;

        if (!token) {
            console.error("ALCHEMY_TOKEN not configured");
            return false;
        }

        if (!webhookId) {
            console.error("ALCHEMY_WEBHOOK_ID not configured");
            return false;
        }

        const response = await axios.patch(
            "https://dashboard.alchemy.com/api/update-webhook-addresses",
            {
                webhook_id: webhookId,
                addresses_to_add: [],
                addresses_to_remove: [address.toLowerCase()],
            },
            {
                headers: {
                    "X-Alchemy-Token": token,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Successfully removed address ${address} from Alchemy webhook`);
        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Alchemy API Error:", error.response?.data || error.message);
        } else {
            console.error("Error removing address from Alchemy webhook:", error);
        }
        return false;
    }
};

/**
 * Get all addresses currently monitored by the webhook
 */
export const getWebhookAddresses = async ():
    Promise<string[]> => {
    try {
        const token = process.env.ALCHEMY_TOKEN;
        const webhookId = process.env.ALCHEMY_WEBHOOK_ID;

        if (!token) {
            console.error("ALCHEMY_TOKEN not configured");
            return [];
        }

        if (!webhookId) {
            console.error("ALCHEMY_WEBHOOK_ID not configured");
            return [];
        }

        const response = await axios.get(
            `https://dashboard.alchemy.com/api/webhook-addresses?webhook_id=${webhookId}`,
            {
                headers: {
                    "X-Alchemy-Token": token,
                },
            }
        );

        // Based on Alchemy docs: response structure is { data: string[], pagination: ... }
        return response.data.data || [];
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Alchemy API Error:", error.response?.data || error.message);
        } else {
            console.error("Error getting webhook addresses:", error);
        }
        return [];
    }
};
