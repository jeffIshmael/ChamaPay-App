import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
let expo = new Expo();

export interface PushNotificationPayload {
    to: string | string[];
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: 'default' | null;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
}

/**
 * Sends a push notification to one or more Expo push tokens.
 * 
 * @param payload The notification payload including recipient(s), title, and body.
 * @returns A promise that resolves when the notifications have been sent to Expo's service.
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<ExpoPushTicket[]> {
    const { to, title, body, data, sound = 'default', badge, priority = 'default' } = payload;
    const recipients = Array.isArray(to) ? to : [to];
    const messages: ExpoPushMessage[] = [];

    for (const token of recipients) {
        // Check that all your push tokens appear to be valid Expo push tokens
        if (!Expo.isExpoPushToken(token)) {
            console.error(`Push token ${token} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: token,
            title,
            body,
            data,
            sound,
            badge,
            priority,
        });
    }

    // The Expo push notification service accepts batches of messages.
    // We recommend batching your messages to reduce the number of requests.
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
            // NOTE: If a ticket contains an error code in ticket.details.error, you
            // should handle it appropriately. Expo tokens can become invalid, etc.
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
        }
    }

    return tickets;
}

/**
 * Checks the status of push notification receipts.
 * 
 * @param ticketIds The IDs of the tickets received from sendPushNotification.
 */
export async function checkPushReceipts(ticketIds: string[]) {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

    for (const chunk of receiptIdChunks) {
        try {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

            for (const receiptId in receipts) {
                const { status, message, details } = receipts[receiptId] as any;
                if (status === 'ok') {
                    continue;
                } else if (status === 'error') {
                    console.error(`There was an error sending a notification: ${message}`);
                    if (details && details.error) {
                        // The error codes are listed in the Expo documentation:
                        // https://docs.expo.dev/push-notifications/sending-notifications/#individual-errors
                        // You should handle the 'DeviceNotRegistered' error specifically by removing the token
                        console.error(`The error code is ${details.error}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking receipts:', error);
        }
    }
}