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

