// this file contains functions for sending notifications to users
import { PrismaClient } from "@prisma/client";
import { ExpoPushTicket } from "expo-server-sdk";
import { PushNotificationPayload, sendPushNotification } from "./ExpoNotification";

const prisma = new PrismaClient();


// function to send expo notification to all users
export async function sendExpoNotificationToAllUsers(tittle: string, body: string): Promise<ExpoPushTicket[]> {
    try {
        // get users with expo push token and pushNotify set to true
        const users = await prisma.user.findMany({
            where: {
                pushNotify: true,
                expoPushToken: {
                    not: null
                }
            }
        });
        const to = users.map(user => user.expoPushToken).filter((token): token is string => token !== null);
        const notification: PushNotificationPayload = {
            to,
            sound: "default",
            title: tittle,
            body: body,
            data: {
                type: "notification",
            },
        };
        const response = await sendPushNotification(notification);
        return response;
    } catch (error) {
        console.log(error);
        return [];
    }

}

// function to send notification to a user
export async function sendExpoNotificationToAUser(userId: number, tittle: string, body: string): Promise<ExpoPushTicket[]> {
    try {
        // get users with expo push token and pushNotify set to true
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                pushNotify: true,
                expoPushToken: {
                    not: null
                }
            }
        });
        const to = user?.expoPushToken;
        if (!to) {
            console.log(`User ${userId} does not have a push token or push notifications disabled`);
            return [];
        }
        const notification: PushNotificationPayload = {
            to,
            sound: "default",
            title: tittle,
            body: body,
            data: {
                type: "notification",
            },
        };
        const response = await sendPushNotification(notification);
        return response;
    } catch (error) {
        console.log(error);
        return [];
    }

}

// function to senf expo notification to all members of a chama excluding some members
export async function sendExpoNotificationToAllChamaMembers(tittle: string, body: string, chamaId: number, excludeUserIds?: number[] | number): Promise<ExpoPushTicket[]> {
    try {
        // get chama members expo push token and pushNotify set to true
        let members = [];
        members = await prisma.chamaMember.findMany({
            where: {
                chamaId: chamaId,
                user: {
                    pushNotify: true,
                    expoPushToken: {
                        not: null
                    },
                }
            },
            include: {
                user: true
            }
        });
        // exclude members with user id in excludeUserIds
        if (excludeUserIds) {
            const excludeIds = Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds];
            members = members.filter(member => !excludeIds.includes(member.userId));
        }
        const to = members.map(member => member.user.expoPushToken).filter((token): token is string => token !== null);
        const notification: PushNotificationPayload = {
            to,
            sound: "default",
            title: tittle,
            body: body,
            data: {
                type: "notification",
            },
        };
        const response = await sendPushNotification(notification);
        return response;
    } catch (error) {
        console.log(error);
        return [];
    }

}

// [ { status: 'ok', id: '019c1dea-d62c-7177-a180-3a9bfed1e021' } ]
