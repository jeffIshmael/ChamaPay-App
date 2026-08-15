const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const txCounts = await prisma.$queryRaw`
        SELECT LOWER("txHash") as hash, COUNT(*) as count
        FROM "Payment"
        GROUP BY LOWER("txHash")
        HAVING COUNT(*) > 1
        LIMIT 5;
    `;
    console.log("All Tx hashes with multiple payments (case insensitive):", txCounts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
