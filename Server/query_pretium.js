const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.pretiumTransaction.findMany({
        select: {
            isOnramp: true,
            type: true,
            status: true,
            amount: true,
            cusdAmount: true,
            transactionCode: true,
        }
    });
    console.log(txs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
