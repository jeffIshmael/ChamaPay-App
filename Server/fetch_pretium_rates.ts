import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.pretiumTransaction.findMany({
        where: { exchangeRate: { not: null } },
        select: {
            isOnramp: true,
            exchangeRate: true,
            createdAt: true
        }
    });

    const onramp = transactions
        .filter(t => t.isOnramp)
        .map(t => ({ rate: t.exchangeRate?.toString(), date: t.createdAt }));
    
    const offramp = transactions
        .filter(t => !t.isOnramp)
        .map(t => ({ rate: t.exchangeRate?.toString(), date: t.createdAt }));

    const result = { onramp, offramp };
    
    fs.writeFileSync("pretium_rates.json", JSON.stringify(result, null, 2));
    console.log("Written to pretium_rates.json");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
