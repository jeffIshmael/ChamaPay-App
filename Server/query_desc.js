const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$queryRaw`SELECT description, COUNT(*) FROM "Payment" WHERE "chamaId" IS NULL GROUP BY description;`;
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
