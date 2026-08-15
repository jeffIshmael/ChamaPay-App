const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$queryRaw`SELECT "doneAt", description FROM "Payment" WHERE description IN ('Moonwell Deposit', 'Moonwell Withdrawal') ORDER BY "doneAt" DESC LIMIT 5`;
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
