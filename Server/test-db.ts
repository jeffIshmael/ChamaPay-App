import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const chama = await prisma.chama.findFirst({
    include: {
      _count: {
        select: { messages: true, payments: true }
      }
    },
    orderBy: {
      messages: { _count: "desc" }
    }
  });
  console.log("User:", user?.id, user?.smartAddress);
  console.log("Chama:", chama?.slug, "Messages:", chama?._count.messages, "Payments:", chama?._count.payments);
}
main().catch(console.error).finally(() => prisma.$disconnect());
