const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.$queryRaw`
      WITH UniquePayments AS (
        SELECT DISTINCT ON ("txHash") id, "doneAt", "chamaId", amount, "txHash", description, sender, receiver
        FROM "Payment"
      )
      SELECT 
        'payment-' || id AS id, 
        "doneAt" as "timestamp", 
        CASE 
          WHEN "chamaId" IS NOT NULL THEN 'contribution'
          WHEN description IN ('Received', 'Wallet deposit') THEN 
            CASE WHEN LOWER(sender) IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL) THEN 'peer_transfer' ELSE 'transfer_in' END
          WHEN description = 'Transfer' THEN 
            CASE WHEN LOWER(receiver) IN (SELECT LOWER("smartAddress") FROM "User" WHERE "smartAddress" IS NOT NULL) THEN 'peer_transfer' ELSE 'transfer_out' END
          ELSE 'other'
        END as "actionType",
        CAST(amount AS NUMERIC) as "amountUsdc", 
        "txHash"
      FROM UniquePayments
      LIMIT 10;
    `;
    console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
