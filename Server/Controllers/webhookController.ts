import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { Request, Response } from "express";
import { USDCAddress } from "../Blockchain/Constants";
import { sendExpoNotificationToAUser } from "../Lib/ExpoNotificationFunctions";

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
        console.log("Received webhook request");
        console.log(req.body);
        const signature = req.headers["x-alchemy-signature"] as string;
        const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

        if (!signingKey) {
            console.error("ALCHEMY_WEBHOOK_SIGNING_KEY not configured");
            res.status(500).json({ error: "Webhook signing key not configured" });
            return;
        }

        // Validate signature
        const body = (req as any).rawBody || JSON.stringify(req.body);
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
        const processedThisRequest = new Set<string>();

        for (const activity of activities) {
            // Check if this is a USDC transfer
            const isUSDCTransfer =
                activity.category === "token" &&
                activity.asset === "USDC" &&
                activity.rawContract?.address?.toLowerCase() ===
                USDCAddress?.toLowerCase();

            if (!isUSDCTransfer) continue;

            const txHash = activity.hash?.toLowerCase();
            const toAddress = activity.toAddress?.toLowerCase();
            const fromAddress = activity.fromAddress?.toLowerCase();
            const rawValue = activity.rawContract?.rawValue;

            if (!toAddress || !rawValue || !txHash) {
                console.log("Missing required transfer data");
                continue;
            }

            // 1. Prevent processing the same tx+recipient combination twice in ONE request
            const uniqueId = `${txHash}-${toAddress}`;
            if (processedThisRequest.has(uniqueId)) continue;
            processedThisRequest.add(uniqueId);

            // 2. Find Recipient (User)
            const user = await prisma.user.findFirst({
                where: {
                    smartAddress: { equals: toAddress, mode: "insensitive" },
                },
            });

            if (!user) {
                console.log(`No user found for address: ${toAddress}`);
                continue;
            }

            // 3. Check for Existing Record (Idempotency check)
            // This is the most important check for Alchemy retries
            const existingPayment = await prisma.payment.findFirst({
                where: {
                    txHash: { equals: txHash, mode: "insensitive" },
                    userId: user.id
                }
            });

            if (existingPayment) {
                console.log(`Transfer ${txHash} already processed for user ${user.id}`);
                continue;
            }

            // 4. Data Preparation
            const senderUser = await prisma.user.findFirst({
                where: {
                    smartAddress: { equals: fromAddress, mode: "insensitive" },
                },
            });

            const senderDisplayName = senderUser ? `@${senderUser.userName}` : shortenAddress(activity.fromAddress);
            const amount = formatUSDCAmount(rawValue);
            const title = "💰 USDC Received";
            const body = `You've received ${amount} USDC from ${senderDisplayName}`;

            try {
                // 5. Commit to Database FIRST
                // If this fails (e.g. unique constraint), it will throw and the code below won't run
                await prisma.$transaction([
                    prisma.payment.create({
                        data: {
                            amount: amount,
                            txHash: txHash,
                            userId: user.id,
                            chamaId: null,
                            description: "Received",
                            doneAt: new Date(),
                            receiver: toAddress,
                        }
                    })
                ]);

                // 6. Send push notification ONLY after DB commit
                // If this fails, the DB record still exists, so a retry will be caught by Step 3
                console.log(`Sending notification to user ${user.id}: ${body}`);
                await sendExpoNotificationToAUser(user.id, title, body);

            } catch (dbError) {
                console.error(`Failed to record transfer ${txHash} for user ${user.id}:`, dbError);
                // We don't continue here - we want the loop to finish other activities if any
            }
        }

        res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Alchemy webhook error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
