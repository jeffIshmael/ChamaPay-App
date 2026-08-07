import { serverUrl } from "@/constants/serverUrl";
import * as SecureStore from "expo-secure-store";

export const getUnseenOutcomes = async () => {
    try {
        const token = await SecureStore.getItemAsync("userToken");
        if (!token) return [];

        const response = await fetch(`${serverUrl}/stats/unseen-outcomes`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch outcomes: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching unseen outcomes:", error);
        throw error;
    }
};

export const markOutcomeSeen = async (outcomeId: number) => {
    try {
        const token = await SecureStore.getItemAsync("userToken");
        if (!token) throw new Error("No token found");

        const response = await fetch(`${serverUrl}/stats/outcome/${outcomeId}/seen`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to mark outcome as seen: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error marking outcome seen:", error);
        throw error;
    }
};
