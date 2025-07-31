// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateUniqueSlug } from "../Utils/HelperFunctions";

const prisma = new PrismaClient();

interface CreateChamaRequestBody {
  chamaData: {
    name: string;
    description: string;
    type: string;
    tags: string | null;
    amount: string;
    cycleTime: number;
    maxNo: number;
    startDate: Date;
    blockchainId: string;
    promoCode: string;
    txHash: string | null;
  };
}

// create a chama
export const createChama = async (req: Request<{}, {}, CreateChamaRequestBody>, res: Response) => {
    const { chamaData } = req.body;
    console.log(chamaData);
    try {
        const { name, description, type, tags, amount, cycleTime, maxNo, startDate, blockchainId, promoCode, txHash } = chamaData;
        
        // Generate unique slug from name
        const uniqueSlug = await generateUniqueSlug(name);
        
        // First, create the Chama
        const chama = await prisma.chama.create({
            data: {
                name: name,
                description: description,
                tags: tags,
                type: type,
                amount: amount, // amount in string
                cycleTime: cycleTime,
                maxNo: maxNo || 15,
                slug: uniqueSlug,
                startDate: new Date(startDate),
                payDate: new Date(
                    new Date(startDate).getTime() + cycleTime * 24 * 60 * 60 * 1000
                ),
                blockchainId: blockchainId.toString(),
                round: 1,
                cycle: 1,
                promoCode: promoCode,
                // Note: admin connection needs proper implementation based on your auth system
                admin: { connect: { id: req.user?.userId } },
            },
        });

        if (chama) {
            // Then, make the admin a member
            await prisma.chamaMember.create({
              data: {
                user: {
                  connect: {
                    id: req.user?.userId,
                  },
                },
                chama: {
                  connect: { id: chama.id },
                },
                payDate: new Date(),
              },
            });
            if (type === "Public" && txHash) {
              await prisma.payment.create({
                data: {
                  amount: amount, // amount in string
                  txHash: txHash,
                  description: "Chama creation collateral payment",
                  chamaId: chama.id,
                  userId: req.user?.userId || 0,
                },
              });
            }
        }
        
        res.status(201).json({ 
          success: true, 
          chama: {
            ...chama,
            amount: chama.amount.toString() // Convert BigInt to string for JSON response
          }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Failed to create chama" });
    }
}
