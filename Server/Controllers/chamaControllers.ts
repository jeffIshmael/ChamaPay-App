// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { bcGetTotalChamas } from "../Blockchain/ReadFunctions";
import { bcCreateChama } from "../Blockchain/WriteFunction";
import { generateUniqueSlug, getUserPrivateKey } from "../Utils/HelperFunctions";

const prisma = new PrismaClient();

interface CreateChamaRequestBody {
  chamaData: {
    name: string;
    description: string;
    type: string;
    adminTerms: string | null;
    amount: string;
    cycleTime: number;
    maxNo: number;
    startDate: Date;
    promoCode: string;
    collateralRequired: boolean;
  };
}

// create a chama
export const createChama = async (req: Request<{}, {}, CreateChamaRequestBody>, res: Response) => {
    const { chamaData } = req.body;
    console.log(chamaData);
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
            promoCode, 
            collateralRequired
        } = chamaData;
        
        // Generate unique slug from name
        const uniqueSlug = await generateUniqueSlug(name);
        
        // Determine if collateral is required based on chama type
        const isCollateralRequired = type === "Public" ? (collateralRequired ?? true) : false;
        // get the blockchain id
        const totalChamas = await bcGetTotalChamas();

        // register chama on blockchain
        const privateKey = await getUserPrivateKey(req.user?.userId || 0);
        const startDateObj = new Date('2025-08-15T19:46:00.000Z');
        // Ensure the date is in the future and convert to seconds
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startTimestamp = Math.floor(startDateObj.getTime() / 1000);
        
        // Add validation to ensure start date is in the future
        if (startTimestamp <= currentTimestamp) {
            throw new Error("Start date must be in the future");
        }
        
        const hash = await bcCreateChama(privateKey as `0x${string}`, amount, cycleTime, startTimestamp, maxNo, isCollateralRequired);
        if (!hash) {
            throw new Error("Failed to create chama on blockchain");
        }        
        // First, create the Chama
        const chama = await prisma.chama.create({
            data: {
                name: name,
                description: description,
                adminTerms: adminTerms,
                type: type,
                amount: amount, // amount in string
                cycleTime: cycleTime,
                maxNo: maxNo || 15,
                slug: uniqueSlug,
                startDate: new Date(startDate),
                payDate: new Date(
                    new Date(startDate).getTime() + cycleTime * 24 * 60 * 60 * 1000
                ),
                blockchainId: totalChamas,
                round: 1,
                cycle: 1,
                promoCode: promoCode,
                collateralRequired: isCollateralRequired,
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
            
            // Handle collateral payment for public chamas that require it
            if (type === "Public" && isCollateralRequired && hash) {
              await prisma.payment.create({
                data: {
                  amount: amount, // amount in string
                  txHash: hash,
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

// get chama by slug
export const getChamaBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const chama = await prisma.chama.findUnique({
        where: { slug: slug },
        include: {
          members: {
            include: {
              user: true,
            }
          },
          payments: true,
          admin: true,
        }
    });
    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }
    return res.status(200).json({ success: true, chama: chama });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Failed to get chama" });
  }
 
}

// get chamas user is a member of
export const getChamasUserIsMemberOf = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const chamas = await prisma.chamaMember.findMany({
      where: {
        userId: userId,
      },
      include: {
        chama: true,

      }
    });
    return res.status(200).json({ success: true, chamas: chamas });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Failed to get chamas user is a member of" });
  }
}

// get public chamas a user is not member of
export const getPublicChamasUserIsNotMemberOf = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const chamas = await prisma.chama.findMany({
      where: {
        type: "Public",
        members: {
          none: {
            userId: userId,
          }
        }
      }
    });
    return res.status(200).json({ success: true, chamas: chamas });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Failed to get public chamas user is not member of" });
  }
}
