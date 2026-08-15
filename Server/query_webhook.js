const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.payment.findFirst({
        where: { description: 'Transfer' },
        orderBy: { id: 'desc' }
    });
    console.log("Last Transfer txHash:", tx?.txHash);
    if(tx) {
        const other = await prisma.payment.findMany({ where: { txHash: tx.txHash } });
        console.log("All records for this txHash:", other);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
