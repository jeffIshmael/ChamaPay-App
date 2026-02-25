import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { getEachMemberBalance, getUserChamaBalance } from "../Blockchain/ReadFunctions";
import { sendExpoNotificationToAllChamaMembers, sendExpoNotificationToAUser } from "../Lib/ExpoNotificationFunctions";
import { generateUniqueSlug } from "../Lib/HelperFunctions";
import { addMemberToPayout, checkHasPendingRequest, getSentRequests, handleRequest, requestToJoin } from "../Lib/prismaFunctions";

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
            txHash
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
        if (type == "Public") {
            await prisma.payment.create({
                data: {
                    amount: amount,
                    description: "Chama creation collateral",
                    txHash: txHash,
                    chamaId: chama.id,
                    userId: userId,
                },
            });
        }

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
// Get user details by address
export const miniappGetUserByAddress = async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        if (!address) {
            return res.status(400).json({ success: false, error: "Address is required" });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { smartAddress: address },
                    { address: address }
                ]
            },
            select: {
                id: true,
                userName: true,
                email: true,
                smartAddress: true,
                profileImageUrl: true,
                address: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("Miniapp get user by address error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get notifications for a user
export const miniappGetUserNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: "User ID is required" });
        }
        const notifications = await prisma.notification.findMany({
            where: { userId: Number(userId) },
            include: {
                chama: true,
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json(notifications);
    } catch (error) {
        console.error("Miniapp get notifications error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get recent payments for a user (payouts and payments)
export const miniappGetRecentPayments = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: "User ID is required" });
        }

        const payments = await prisma.payment.findMany({
            where: { userId: Number(userId) },
            include: {
                chama: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: { doneAt: "desc" },
            take: 20
        });

        const payouts = await prisma.payOut.findMany({
            where: { userId: Number(userId) },
            include: {
                chama: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: { doneAt: "desc" },
            take: 20
        });

        // Combine and sort by date
        const recentActivity = [...payments.map(p => ({ ...p, type: 'payment' })), ...payouts.map(p => ({ ...p, type: 'payout' }))]
            .sort((a, b) => new Date(b.doneAt).getTime() - new Date(a.doneAt).getTime())
            .slice(0, 20);

        // Helper for BigInt serialization
        const bigIntReplacer = (_key: string, value: any) =>
            typeof value === "bigint" ? value.toString() : value;

        return res.status(200).json(JSON.parse(JSON.stringify(recentActivity, bigIntReplacer)));
    } catch (error) {
        console.error("Miniapp get recent payments error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get pending requests for chamas managed by the user
export const miniappGetPendingRequests = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const sentRequests = await getSentRequests(Number(userId));
        return res.status(200).json(sentRequests);
    } catch (error) {
        console.error("Miniapp get pending requests error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get comprehensive user details
export const miniappGetUserDetails = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                notifications: {
                    include: { chama: true, user: true },
                    orderBy: { createdAt: "desc" },
                    take: 20
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const sentRequests = await getSentRequests(userId);

        return res.status(200).json({
            success: true,
            user: {
                ...user,
                sentRequests
            }
        });
    } catch (error) {
        console.error("Miniapp get user details error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get chama details by slug
export const miniappGetChamaBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const { address } = req.query;

        const chama = await prisma.chama.findUnique({
            where: { slug: slug },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                smartAddress: true,
                                userName: true,
                                profileImageUrl: true,
                            },
                        },
                    },
                },
                payments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                smartAddress: true,
                                userName: true,
                                profileImageUrl: true,
                            },
                        },
                    },
                    orderBy: {
                        doneAt: "desc",
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                smartAddress: true,
                                userName: true,
                                profileImageUrl: true,
                            },
                        },
                    },
                },
                admin: {
                    select: {
                        id: true,
                        smartAddress: true,
                        userName: true,
                        profileImageUrl: true,
                    },
                },
                payOuts: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                smartAddress: true,
                                userName: true,
                                profileImageUrl: true,
                            },
                        },
                    },
                },
                roundOutcome: true
            },
        });

        if (!chama) {
            return res.status(404).json({ success: false, error: "Chama not found" });
        }

        let isMember = false;
        let userBalance = "0";
        if (address) {
            isMember = chama.members.some(m => m.user.smartAddress === address);
            // Fetch blockchain balance if address provided
            try {
                const balance = await getUserChamaBalance(address as string, BigInt(Number(chama.blockchainId))) as any;
                userBalance = balance.toString();
            } catch (e) {
                console.warn("Failed to fetch onchain balance for miniapp:", e);
            }
        }

        // Helper for BigInt serialization
        const bigIntReplacer = (_key: string, value: any) =>
            typeof value === "bigint" ? value.toString() : value;

        const eachMemberBalance = await getEachMemberBalance(BigInt(Number(chama.blockchainId)));

        const response = {
            success: true,
            chama: JSON.parse(JSON.stringify({
                ...chama,
                userBalance,
                eachMemberBalance
            }, bigIntReplacer)),
            isMember,
            adminWallet: chama.admin.smartAddress
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Miniapp get chama by slug error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Check if a specific address has a pending join request
export const miniappCheckHasJoinRequest = async (req: Request, res: Response) => {
    try {
        const { address, chamaId } = req.params;

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { smartAddress: address },
                    { address: address }
                ]
            }
        });

        if (!user) {
            return res.status(200).json(false);
        }

        const hasRequest = await checkHasPendingRequest(user.id, Number(chamaId));
        return res.status(200).json(hasRequest);
    } catch (error) {
        console.error("Miniapp check join request error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Send a join request
export const miniappSendJoinRequest = async (req: Request, res: Response) => {
    try {
        const { chamaId } = req.query;
        const { address } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (!chamaId || !address) {
            return res.status(400).json({ success: false, error: "Chama ID and address are required" });
        }

        const chama = await prisma.chama.findUnique({
            where: { id: Number(chamaId) }
        });

        if (!chama) {
            return res.status(404).json({ success: false, error: "Chama not found" });
        }

        const requestingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { smartAddress: address },
                    { address: address }
                ]
            }
        });

        if (!requestingUser) {
            return res.status(404).json({ success: false, error: "Requesting user not found" });
        }

        const request = await requestToJoin(requestingUser.id, Number(chamaId));
        if (!request) {
            return res.status(400).json({ success: false, error: "Failed to send request" });
        }

        // Notify admin
        await sendExpoNotificationToAUser(
            chama.adminId,
            `New join request`,
            `${requestingUser.userName} wants to join ${chama.name}. Tap to review.`
        );

        return res.status(200).json({ success: true, request });
    } catch (error) {
        console.error("Miniapp send join request error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Get messages for a specific chama
export const miniappGetMessages = async (req: Request, res: Response) => {
    try {
        const { chamaId } = req.params;
        if (!chamaId) {
            return res.status(400).json({ success: false, error: "Chama ID is required" });
        }

        const messages = await prisma.message.findMany({
            where: { chamaId: Number(chamaId) },
            include: {
                sender: {
                    select: {
                        id: true,
                        userName: true,
                    }
                }
            },
            orderBy: { timestamp: "asc" }
        });

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender.userName,
            senderId: msg.senderId,
            timestamp: msg.timestamp
        }));

        return res.status(200).json({ success: true, messages: formattedMessages });
    } catch (error) {
        console.error("Miniapp get messages error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Send a message to a chama
export const miniappSendMessage = async (req: Request, res: Response) => {
    try {
        const { chamaId, userId, message } = req.body;
        if (!chamaId || !userId || !message) {
            return res.status(400).json({ success: false, error: "chamaId, userId, and message are required" });
        }

        const newMessage = await prisma.message.create({
            data: {
                chamaId: Number(chamaId),
                senderId: Number(userId),
                text: message
            },
            include: {
                sender: {
                    select: {
                        userName: true
                    }
                },
                chama: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Notify all members
        await sendExpoNotificationToAllChamaMembers(
            "New message",
            `There's a new message in the ${newMessage.chama.name} chama.`,
            Number(chamaId),
            Number(userId)
        );

        return res.status(200).json({
            success: true,
            message: {
                id: newMessage.id,
                text: newMessage.text,
                sender: newMessage.sender.userName,
                senderId: newMessage.senderId,
                timestamp: newMessage.timestamp
            }
        });
    } catch (error) {
        console.error("Miniapp send message error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// Register a chama payment (after on-chain deposit)
export const miniappRegisterChamaPayment = async (req: Request, res: Response) => {
    try {
        const { chamaId, amount, txHash, description } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (!chamaId || !amount || !txHash) {
            return res.status(400).json({ success: false, error: "chamaId, amount, and txHash are required" });
        }

        // Validate membership
        const member = await prisma.chamaMember.findFirst({
            where: {
                chamaId: Number(chamaId),
                userId: userId
            }
        });

        if (!member) {
            return res.status(403).json({ success: false, error: "You are not a member of this chama" });
        }

        const chama = await prisma.chama.findUnique({
            where: { id: Number(chamaId) }
        });

        if (!chama) {
            return res.status(404).json({ success: false, error: "Chama not found" });
        }

        // Record the payment
        const payment = await prisma.payment.create({
            data: {
                amount: amount.toString(),
                description: description || "Chama deposit",
                txHash: txHash,
                chamaId: Number(chamaId),
                userId: userId,
            },
        });

        // Notify all members
        await sendExpoNotificationToAllChamaMembers(
            "New contribution",
            `A member has made a contribution to ${chama.name}.`,
            Number(chamaId),
            userId
        );

        return res.status(200).json({ success: true, payment });
    } catch (error) {
        console.error("Miniapp register chama payment error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};
