// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import encryptionService from "./Encryption";
import dotenv from "dotenv";
import { randomBytes } from "crypto";

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
      where: { slug: uniqueSlug },
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

// function to get non-started chamas
export async function getNonStartedChamas() {
  try {
    const chamas = await prisma.chama.findMany({
      where: {
        started: false,
        startDate: {
          lte: new Date(),
        },
      },
      include: {
        members: true,
      },
    });
    if (chamas.length > 0) {
      return chamas;
    }
    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

// function to get chamas that have reached the paydate
export async function getChamasThatHaveReachedPaydate() {
  try {
    const chamas = await prisma.chama.findMany({
      where: {
        payDate: {
          lte: new Date(),
        },
        started: true,
      },
      include: {
        members: true,
      },
    });
    if (chamas.length > 0) {
      return chamas;
    }
    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

// function to shuffle an array
export function shuffleArray(array: any[]) {
  if (!Array.isArray(array)) {
    throw new Error("Input is not an array");
  }
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// Generates a unique OriginatorConversationID for M-Pesa B2C transactions
export function generateOriginatorConversationID(shortcode: string): string {
  const timestamp = Date.now();
  const randomString = randomBytes(8).toString("hex");
  return `${shortcode}_${timestamp}_${randomString}`;
}
