import { configDotenv } from "dotenv";
configDotenv();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const userId = 1; // mint
  const userMemberships = await prisma.chamaMember.findMany({
    where: { userId },
    select: { chamaId: true },
  });
  const chamaIds = userMemberships.map((m: any) => m.chamaId);
  const searchStr = `|${userId}|`;

  const outcomes = await prisma.roundOutcome.findMany({
    where: {
      chamaId: { in: chamaIds },
      NOT: {
        shownMembers: { contains: searchStr }
      }
    },
    include: { chama: true },
    orderBy: { createdAt: 'asc' }
  });

  const enrichedOutcomes = await Promise.all(outcomes.map(async (outcome: any) => {
    let memberName = "Member";
    if (outcome.disburse) {
      const payOuts = await prisma.payOut.findMany({
        where: { chamaId: outcome.chamaId },
        orderBy: { doneAt: 'desc' },
        take: 1
      });
      if (payOuts.length > 0) {
        const user = await prisma.user.findUnique({ where: { id: payOuts[0].userId } });
        if (user) memberName = user.userName;
      }
    }
    return {
      id: outcome.id,
      chamaName: outcome.chama.name,
      disburse: outcome.disburse,
      cycle: outcome.chamaCycle,
      round: outcome.chamaRound,
      amountPaid: outcome.amountPaid,
      memberName: memberName
    };
  }));

  console.log("Enriched outcomes for user 1:", enrichedOutcomes);
}
main().catch(console.error).finally(() => prisma.$disconnect());
