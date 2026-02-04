import axios from "axios";

/**
 * Add a user's smart address to the Alchemy webhook
 * This allows the webhook to monitor USDC transfers to this address
 */
export const addAddressToWebhook = async (
    address: string,
    webhookId: string
): Promise<boolean> => {
    try {
        const apiKey = process.env.ALCHEMY_API_KEY;

        if (!apiKey) {
            console.error("ALCHEMY_API_KEY not configured");
            return false;
        }

        const response = await axios.patch(
            `https://dashboard.alchemy.com/api/update-webhook-addresses`,
            {
                webhook_id: webhookId,
                addresses_to_add: [address.toLowerCase()],
                addresses_to_remove: [],
            },
            {
                headers: {
                    "X-Alchemy-Token": apiKey,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Successfully added address ${address} to Alchemy webhook`);
        return true;
    } catch (error) {
        console.error("Error adding address to Alchemy webhook:", error);
        return false;
    }
};

/**
 * Remove a user's smart address from the Alchemy webhook
 * Useful when a user deletes their account
 */
export const removeAddressFromWebhook = async (
    address: string,
    webhookId: string
): Promise<boolean> => {
    try {
        const apiKey = process.env.ALCHEMY_API_KEY;

        if (!apiKey) {
            console.error("ALCHEMY_API_KEY not configured");
            return false;
        }

        const response = await axios.patch(
            `https://dashboard.alchemy.com/api/update-webhook-addresses`,
            {
                webhook_id: webhookId,
                addresses_to_add: [],
                addresses_to_remove: [address.toLowerCase()],
            },
            {
                headers: {
                    "X-Alchemy-Token": apiKey,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Successfully removed address ${address} from Alchemy webhook`);
        return true;
    } catch (error) {
        console.error("Error removing address from Alchemy webhook:", error);
        return false;
    }
};

/**
 * Get all addresses currently monitored by the webhook
 */
export const getWebhookAddresses = async (
    webhookId: string
): Promise<string[]> => {
    try {
        const apiKey = process.env.ALCHEMY_API_KEY;

        if (!apiKey) {
            console.error("ALCHEMY_API_KEY not configured");
            return [];
        }

        const response = await axios.get(
            `https://dashboard.alchemy.com/api/webhook-addresses?webhook_id=${webhookId}`,
            {
                headers: {
                    "X-Alchemy-Token": apiKey,
                },
            }
        );

        return response.data.addresses || [];
    } catch (error) {
        console.error("Error getting webhook addresses:", error);
        return [];
    }
};
