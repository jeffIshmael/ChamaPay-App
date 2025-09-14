// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import encryptionService from "./Encryption";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const encryptionSecret = process.env.ENCRYPTION_SECRET;

if (!encryptionSecret) {
    throw new Error("ENCRYPTION_SECRET not configured");
}

// Function to generate unique slug
export async function generateUniqueSlug(baseName: string): Promise<string> {
    let slug = baseName.replace(/\s+/g, "-").toLowerCase();
    let counter = 1;
    let uniqueSlug = slug;
    
    // Check if slug exists and keep trying until we find a unique one
    while (true) {
        const existingChama = await prisma.chama.findUnique({
            where: { slug: uniqueSlug }
        });
        
        if (!existingChama) {
            break; // Found unique slug
        }
        
        // Add counter to make it unique
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
    
    return uniqueSlug;
}

// function that gets the user's id and returns a decrypted private key
export const getUserPrivateKey = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new Error("User not found");
    }
    
   // decrypt the private key
   const encryptedPrivateKey = JSON.parse(user.privKey);
   const decryptedPrivateKey = encryptionService.decrypt(encryptedPrivateKey, encryptionSecret);
   return decryptedPrivateKey;
}