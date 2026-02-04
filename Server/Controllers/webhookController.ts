import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { Request, Response } from "express";
import { sendExpoNotificationToAUser } from "../Lib/ExpoNotificationFunctions";
import { USDCAddress } from "../Blockchain/Constants";

const prisma = new PrismaClient();

// Alchemy webhook signature validation
const validateAlchemySignature = (
    body: string,
    signature: string,
    signingKey: string
): boolean => {
    const hmac = crypto.createHmac("sha256", signingKey);
    const digest = hmac.update(body).digest("hex");
    return signature === digest;
};

// Format USDC amount from raw value (6 decimals)
const formatUSDCAmount = (rawValue: string): string => {
    const value = BigInt(rawValue);
    const decimals = 6;
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    // Format with 2 decimal places
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
    return `${integerPart}.${fractionalStr}`;
};

// Shorten address for display (0x1234...5678)
const shortenAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Handle Alchemy webhook for USDC transfers
export const handleAlchemyWebhook = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const signature = req.headers["x-alchemy-signature"] as string;
        const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

        if (!signingKey) {
            console.error("ALCHEMY_WEBHOOK_SIGNING_KEY not configured");
            res.status(500).json({ error: "Webhook signing key not configured" });
            return;
        }

        // Validate signature
        const body = JSON.stringify(req.body);
        if (!signature || !validateAlchemySignature(body, signature, signingKey)) {
            console.error("Invalid webhook signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
        }

        const payload = req.body;

        // Check if this is an address activity webhook
        if (payload.type !== "ADDRESS_ACTIVITY") {
            res.status(200).json({ message: "Not an address activity event" });
            return;
        }

        // Process each activity in the webhook
        const activities = payload.event?.activity || [];

        for (const activity of activities) {
            // Check if this is a USDC transfer
            const isUSDCTransfer =
                activity.category === "token" &&
                activity.asset === "USDC" &&
                activity.rawContract?.address?.toLowerCase() ===
                USDCAddress?.toLowerCase();

            if (!isUSDCTransfer) {
                continue;
            }

            const toAddress = activity.toAddress?.toLowerCase();
            const fromAddress = activity.fromAddress?.toLowerCase();
            const rawValue = activity.rawContract?.rawValue;

            if (!toAddress || !rawValue) {
                console.log("Missing required transfer data");
                continue;
            }

            // Find user by smart address (recipient)
            const user = await prisma.user.findFirst({
                where: {
                    smartAddress: {
                        equals: toAddress,
                        mode: "insensitive",
                    },
                },
            });

            if (!user) {
                console.log(`No user found for address: ${toAddress}`);
                continue;
            }

            // Format the amount
            const amount = formatUSDCAmount(rawValue);
            const fromAddressShort = shortenAddress(fromAddress);

            // Send notification to user
            const title = "💰 USDC Received";
            const body = `You received ${amount} USDC from ${fromAddressShort}`;

            console.log(`Sending notification to user ${user.id}: ${body}`);

            await sendExpoNotificationToAUser(user.id, title, body);

            // Optional: Create a notification record in database
            // create as a transaction

            await prisma.payment.create({
                data: {
                    amount: amount,
                    txHash: activity.hash,
                    userId: user.id,
                    chamaId: null,
                    description: "Received",
                    doneAt: new Date(),
                    receiver: toAddress,
                }
            })
        }

        res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Alchemy webhook error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
