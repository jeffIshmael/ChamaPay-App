const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chama = await prisma.chama.findUnique({
    where: { id: 4 }
  });
  console.log(chama);
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
