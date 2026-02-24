
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany({ take: 1 })
    console.log('Connection successful, found users:', users.length)
  } catch (e) {
    console.error('Connection failed:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
