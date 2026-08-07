import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { smartAddress: { contains: "0x38da082aA15F974b3D09E61d928775247aE086D4", mode: "insensitive" } }
  });
  
  if (!user) {
    console.log("User not found");
    return;
  }
  
  console.log("User:", user.id);
  
  const yields = await prisma.moonwellYield.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  
  console.log("Yields:", yields);
  
  const recentPayments = await prisma.payment.findMany({
    where: {
      userId: user.id,
      OR: [
        { description: "Moonwell Deposit" },
        { description: "Moonwell Withdrawal" }
      ]
    },
    orderBy: { doneAt: "desc" }
  });
  
  console.log("Payments:", recentPayments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
