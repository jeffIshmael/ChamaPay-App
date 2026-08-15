const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.payment.findMany({
        where: { description: "Received" },
        take: 4
    });
    console.log(txs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
