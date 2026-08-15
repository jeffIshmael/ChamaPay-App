const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const all = await prisma.$queryRaw`
      SELECT id, description, sender, receiver, "chamaId" FROM "Payment"
      WHERE "chamaId" IS NULL
        AND description NOT IN ('Moonwell Deposit', 'Moonwell Withdrawal')
        AND NOT (description IN ('Received', 'Wallet deposit') AND LOWER(sender) NOT IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL))
        AND NOT (description = 'Transfer' AND LOWER(receiver) NOT IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL))
        AND NOT (
            (description IN ('Received', 'Wallet deposit') AND LOWER(sender) IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL))
            OR 
            (description = 'Transfer' AND LOWER(receiver) IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL))
        )
    `;
    console.log(all);
}
main().catch(console.error).finally(() => prisma.$disconnect());
