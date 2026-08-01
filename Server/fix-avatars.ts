import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { profileImageUrl: null },
        { profileImageUrl: "" }
      ]
    }
  });

  console.log(`Found ${users.length} users with empty avatars`);

  for (const user of users) {
    if (user.userName) {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=1c8584&color=fff&size=256`;
      await prisma.user.update({
        where: { id: user.id },
        data: { profileImageUrl: avatarUrl }
      });
      console.log(`Updated ${user.userName}`);
    }
  }

  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
