const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$queryRaw`SELECT id, description, sender FROM "Payment" WHERE description = 'Wallet deposit'`;
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
