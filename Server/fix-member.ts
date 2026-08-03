import { PrismaClient } from "@prisma/client";
import { addMemberToPayout, notifyAllChamaMembers } from "./Lib/prismaFunctions";
import emailService from "./Lib/EmailService";
import { sendExpoNotificationToAllChamaMembers } from "./Lib/ExpoNotificationFunctions";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { userName: "icarus" }
  });
  
  if (!user) {
    console.log("User not found");
    return;
  }
  console.log("Found user:", user.id, user.userName, user.smartAddress);

  const chamaId = 4;
  const chama = await prisma.chama.findUnique({
    where: { id: chamaId },
    include: {
        members: { include: { user: true } },
        admin: true
    }
  });

  if (!chama) {
    console.log("Chama not found");
    return;
  }
  console.log("Found chama:", chama.name);

  // Check if already a member
  const existingMember = await prisma.chamaMember.findFirst({
    where: { userId: user.id, chamaId: chamaId }
  });

  if (existingMember) {
    console.log("Already a member in DB");
  } else {
    console.log("Adding member to DB...");
    await prisma.chamaMember.create({
      data: {
        userId: user.id,
        chamaId: chamaId,
        payDate: new Date(),
      }
    });
    console.log("Member added to DB.");
  }

  console.log("Adding to payout order...");
  await addMemberToPayout(chamaId, user.id);

  console.log("Sending notifications...");
  await notifyAllChamaMembers(
    chamaId,
    `A new member has joined ${chama.name} chama.`,
    "join",
    user.id
  );

  await sendExpoNotificationToAllChamaMembers(
    `New member joined.`,
    `A new member has joined ${chama.name} chama.`,
    chamaId,
    [user.id]
  );

  const emails = chama.members.map((m: any) => m.user.email);
  if (emails.length > 0) {
    await emailService.sendMemberAddedToExistingMembersEmail(
      emails,
      chama.name,
      user.userName,
      chama.members.length + 1
    );
  }

  if (user.email) {
    const adminName = chama.admin.userName || "the Admin";
    await emailService.sendMemberAddedToNewMemberEmail(
      user.email,
      chama.name,
      adminName,
      chama.amount,
      chama.cycleTime,
      chama.payDate
    );
  }
  
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
