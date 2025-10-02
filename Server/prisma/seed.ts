import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah@email.com',
        name: 'Sarah Johnson',
        phoneNo: 722345678,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        privKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        mnemonics: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        profile: 'Young professional interested in investment opportunities',
        profileImageUrl: null,
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@email.com',
        name: 'Alice Mwangi',
        phoneNo: 700111222,
        address: '0x2345678901bcdef1234567890abcdef1234567890',
        privKey: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        mnemonics: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: await bcrypt.hash('password123', 10),
        role: 'admin',
        profile: 'Experienced chama administrator',
        profileImageUrl: null,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mary@email.com',
        name: 'Mary Wanjiru',
        phoneNo: 700222333,
        address: '0x3456789012cdef1234567890abcdef12345678901',
        privKey: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        mnemonics: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        profile: 'Entrepreneur focused on women empowerment',
        profileImageUrl: null,
      },
    }),
    prisma.user.create({
      data: {
        email: 'james@email.com',
        name: 'James Mwangi',
        phoneNo: 701444555,
        address: '0x4567890123def1234567890abcdef123456789012',
        privKey: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        mnemonics: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        profile: 'Family man looking to support his community',
        profileImageUrl: null,
      },
    }),
    prisma.user.create({
      data: {
        email: 'brian@email.com',
        name: 'Brian Otieno',
        phoneNo: 702555666,
        address: '0x5678901234ef1234567890abcdef1234567890123',
        privKey: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde',
        mnemonics: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        profile: 'Young professional in tech industry',
        profileImageUrl: null,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create chamas
  const chamas = await Promise.all([
    prisma.chama.create({
      data: {
        name: 'Women Entrepreneurs Chama',
        slug: 'women-entrepreneurs-chama',
        description: 'Supporting women entrepreneurs in building successful businesses and financial independence',
        adminTerms: JSON.stringify(['Must be a woman entrepreneur.', 'Contributions must be made monthly.']),
        type: 'Private',
        startDate: new Date('2024-07-01'),
        payDate: new Date('2024-08-15'),
        cycleTime: 30,
        amount: '5000',
        maxNo: 5,
        blockchainId: '1',
        adminId: users[1].id, // Alice as admin
        collateralRequired: true,
        promoCode: 'WOMEN2024',
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Young Professionals Investment Group',
        slug: 'young-professionals-investment-group',
        description: 'A group of young professionals pooling resources for joint investments and financial growth.',
        adminTerms: JSON.stringify(['Must be a young professional.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-07-01'),
        payDate: new Date('2024-08-25'),
        cycleTime: 30,
        amount: '3000',
        maxNo: 10,
        blockchainId: '2',
        adminId: users[1].id, // Alice as admin
        collateralRequired: false,
        promoCode: 'YOUNG2024',
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Family Welfare Chama',
        slug: 'family-welfare-chama',
        description: 'A family-based chama for supporting each other in times of need and celebrating milestones.',
        adminTerms: JSON.stringify(['Must be a family member.', 'Contributions must be made monthly.']),
        type: 'Private',
        startDate: new Date('2024-07-01'),
        payDate: new Date('2024-09-01'),
        cycleTime: 30,
        amount: '2000',
        maxNo: 10,
        blockchainId: '3',
        adminId: users[3].id, // James as admin
        collateralRequired: false,
        promoCode: 'FAMILY2024',
      },
    }),
  ]);

  console.log(`✅ Created ${chamas.length} chamas`);

  // Create chama members
  const chamaMembers = await Promise.all([
    // Women Entrepreneurs Chama members
    prisma.chamaMember.create({
      data: {
        userId: users[0].id, // Sarah
        chamaId: chamas[0].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[1].id, // Alice (admin)
        chamaId: chamas[0].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[2].id, // Mary
        chamaId: chamas[0].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),

    // Young Professionals Investment Group members
    prisma.chamaMember.create({
      data: {
        userId: users[0].id, // Sarah
        chamaId: chamas[1].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[1].id, // Alice (admin)
        chamaId: chamas[1].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[4].id, // Brian
        chamaId: chamas[1].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),

    // Family Welfare Chama members
    prisma.chamaMember.create({
      data: {
        userId: users[0].id, // Sarah
        chamaId: chamas[2].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[3].id, // James (admin)
        chamaId: chamas[2].id,
        isPaid: true,
        payDate: new Date('2024-07-01'),
      },
    }),
  ]);

  console.log(`✅ Created ${chamaMembers.length} chama members`);

  // Create messages
  const messages = await Promise.all([
    // Women Entrepreneurs Chama messages
    prisma.message.create({
      data: {
        chamaId: chamas[0].id,
        senderId: users[1].id, // Alice (admin)
        text: 'Welcome to Savings Champions! Please make sure to contribute by the 30th of each month.',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[0].id,
        senderId: users[2].id, // Mary
        text: 'Has everyone made their contribution this month? The deadline is approaching.',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[0].id,
        senderId: users[0].id, // Sarah
        text: 'Yes, just sent mine. Thanks for the reminder! 💪',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[0].id,
        senderId: users[1].id, // Alice (admin)
        text: 'All contributions received except 2 members. Next payout is scheduled for Aug 15.',
      },
    }),

    // Young Professionals Investment Group messages
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
        senderId: users[1].id, // Alice (admin)
        text: 'Welcome to the group! Let\'s make smart investments together.',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
        senderId: users[4].id, // Brian
        text: 'Looking forward to the next payout round!',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
        senderId: users[0].id, // Sarah
        text: 'Excited for my turn this month!',
      },
    }),

    // Family Welfare Chama messages
    prisma.message.create({
      data: {
        chamaId: chamas[2].id,
        senderId: users[3].id, // James (admin)
        text: 'Remember to contribute before the end of the month.',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[2].id,
        senderId: users[3].id, // James
        text: 'Thank you all for your support!',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[2].id,
        senderId: users[0].id, // Sarah
        text: 'Happy to help, James!',
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} messages`);

  // Create payments
  const payments = await Promise.all([
    // Women Entrepreneurs Chama payments
    prisma.payment.create({
      data: {
        amount: '5000',
        description: 'Monthly contribution',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        userId: users[0].id,
        chamaId: chamas[0].id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: '5000',
        description: 'Monthly contribution',
        txHash: '0x2345678901bcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        userId: users[1].id,
        chamaId: chamas[0].id,
      },
    }),

    // Young Professionals Investment Group payments
    prisma.payment.create({
      data: {
        amount: '3000',
        description: 'Monthly contribution',
        txHash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef123',
        userId: users[0].id,
        chamaId: chamas[1].id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: '3000',
        description: 'Monthly contribution',
        txHash: '0x4567890123def1234567890abcdef1234567890abcdef1234567890abcdef1234',
        userId: users[4].id,
        chamaId: chamas[1].id,
      },
    }),

    // Family Welfare Chama payments
    prisma.payment.create({
      data: {
        amount: '2000',
        description: 'Monthly contribution',
        txHash: '0x5678901234ef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        userId: users[0].id,
        chamaId: chamas[2].id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: '2000',
        description: 'Monthly contribution',
        txHash: '0x6789012345f1234567890abcdef1234567890abcdef1234567890abcdef123456',
        userId: users[3].id,
        chamaId: chamas[2].id,
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} payments`);

  // Create notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        message: 'New message in Women Entrepreneurs Chama',
        userId: users[0].id,
        chamaId: chamas[0].id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        message: 'Payment reminder for Young Professionals Investment Group',
        userId: users[0].id,
        chamaId: chamas[1].id,
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        message: 'Your turn is coming up in Family Welfare Chama',
        userId: users[0].id,
        chamaId: chamas[2].id,
        read: true,
      },
    }),
  ]);

  console.log(`✅ Created ${notifications.length} notifications`);

  // Create payouts
  const payouts = await Promise.all([
    prisma.payOut.create({
      data: {
        amount: BigInt(25000),
        txHash: '0x78901234561234567890abcdef1234567890abcdef1234567890abcdef1234567',
        receiver: users[2].name || 'Mary Wanjiru',
        userId: users[2].id,
        chamaId: chamas[0].id,
      },
    }),
    prisma.payOut.create({
      data: {
        amount: BigInt(24000),
        txHash: '0x8901234567234567890abcdef1234567890abcdef1234567890abcdef12345678',
        receiver: users[1].name || 'Alice Mwangi',
        userId: users[1].id,
        chamaId: chamas[1].id,
      },
    }),
  ]);

  console.log(`✅ Created ${payouts.length} payouts`);

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Chamas: ${chamas.length}`);
  console.log(`- Chama Members: ${chamaMembers.length}`);
  console.log(`- Messages: ${messages.length}`);
  console.log(`- Payments: ${payments.length}`);
  console.log(`- Notifications: ${notifications.length}`);
  console.log(`- Payouts: ${payouts.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });