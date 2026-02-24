import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { sendExpoNotificationToAllChamaMembers } from "../Lib/ExpoNotificationFunctions";
import { generateUniqueSlug } from "../Lib/HelperFunctions";
import { addMemberToPayout, handleRequest } from "../Lib/prismaFunctions";

const prisma = new PrismaClient();

// Create a chama (Prisma-only)
export const miniappCreateChama = async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            type,
            adminTerms,
            amount,
            cycleTime,
            maxNo,
            startDate,
            blockchainId,
        } = req.body;

        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (!blockchainId) {
            return res.status(400).json({ success: false, error: "Blockchain ID is required." });
        }

        const uniqueSlug = await generateUniqueSlug(name);

        const chama = await prisma.chama.create({
            data: {
                name,
                description,
                adminTerms,
                type,
                amount,
                cycleTime,
                maxNo: maxNo || 15,
                slug: uniqueSlug,
                startDate: new Date(startDate),
                payDate: new Date(
                    new Date(startDate).getTime() + cycleTime * 24 * 60 * 60 * 1000
                ),
                blockchainId: blockchainId.toString(),
                round: 1,
                cycle: 1,
                admin: { connect: { id: userId } },
            },
        });

        // Make admin a member
        await prisma.chamaMember.create({
            data: {
                userId: userId,
                chamaId: chama.id,
                payDate: new Date(),
            },
        });

        return res.status(201).json({ success: true, chama });
    } catch (error) {
        console.error("Miniapp create chama error:", error);
        return res.status(500).json({ success: false, error: "Failed to create chama" });
    }
};

// Join a public chama (Prisma-only)
export const miniappJoinChama = async (req: Request, res: Response) => {
    try {
        const { chamaId, amount, txHash } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (!chamaId || !txHash || !amount) {
            return res.status(400).json({ success: false, error: "Chama ID, amount, and txHash are required" });
        }

        const chama = await prisma.chama.findUnique({ where: { id: Number(chamaId) } });
        if (!chama) {
            return res.status(404).json({ success: false, error: "Chama not found" });
        }

        // Add as member
        const member = await prisma.chamaMember.create({
            data: {
                userId: userId,
                chamaId: Number(chamaId),
                payDate: new Date(),
            },
        });

        // Record collateral payment
        await prisma.payment.create({
            data: {
                amount: amount,
                description: "Joining collateral",
                txHash: txHash,
                chamaId: Number(chamaId),
                userId: userId,
            },
        });

        // Add to payout
        await addMemberToPayout(Number(chamaId), userId);

        await sendExpoNotificationToAllChamaMembers(
            `New member joined.`,
            `A new member has joined ${chama.name} chama.`,
            Number(chamaId),
            userId
        );

        return res.status(200).json({ success: true, member });
    } catch (error) {
        console.error("Miniapp join chama error:", error);
        return res.status(500).json({ success: false, error: "Failed to join chama" });
    }
};

// Approve a join request (Prisma-only)
export const miniappConfirmJoinRequest = async (req: Request, res: Response) => {
    try {
        const { requestId, decision } = req.body; // decision: "approve" or "reject"
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (!requestId || !decision) {
            return res.status(400).json({ success: false, error: "Request ID and decision are required" });
        }

        const request = await prisma.chamaRequest.findUnique({
            where: { id: Number(requestId) },
            include: { chama: true, user: true }
        });

        if (!request) {
            return res.status(404).json({ success: false, error: "Request not found" });
        }

        if (userId !== request.chama.adminId) {
            return res.status(403).json({ success: false, error: "Only admin can approve requests" });
        }

        const isApproved = decision === "approve";

        // handleRequest updates status, creates member, and sends notifications
        const result = await handleRequest(
            Number(requestId),
            request.chama.name,
            request.user.userName,
            isApproved
        );

        if (!result) {
            return res.status(400).json({ success: false, error: "Failed to handle request" });
        }

        return res.status(200).json({ success: true, request: result });
    } catch (error) {
        console.error("Miniapp confirm request error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};
