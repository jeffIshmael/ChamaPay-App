import { PrismaClient } from "@prisma/client";
import { addAddressToWebhook } from "./Lib/AlchemyWebhook";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { smartAddress: { not: "" } },
        select: { smartAddress: true, userName: true }
    });

    console.log(`Found ${users.length} users with smart addresses.`);
    
    for (const user of users) {
        if (user.smartAddress) {
            console.log(`Adding ${user.userName} (${user.smartAddress}) to Alchemy...`);
            await addAddressToWebhook(user.smartAddress);
        }
    }
    
    console.log("Done.");
}

main().catch(console.error);
