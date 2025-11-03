import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah@email.com',
        userName: 'Sarah Johnson',
        phoneNo: 722345678,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        smartAddress: '0x1234567890abcdef1234567890abcdef12345678',
        profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@email.com',
        userName: 'Alice Mwangi',
        phoneNo: 700111222,
        address: '0x2345678901bcdef1234567890abcdef1234567890',
        smartAddress: '0x2345678901bcdef1234567890abcdef1234567890',
        profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mary@email.com',
        userName: 'Mary Wanjiru',
        phoneNo: 700222333,
        address: '0x3456789012cdef1234567890abcdef12345678901',
        smartAddress: '0x3456789012cdef1234567890abcdef12345678901',
        profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
      },
    }),
    prisma.user.create({
      data: {
        email: 'james@email.com',
        userName: 'James Mwangi',
        phoneNo: 701444555,
        address: '0x4567890123def1234567890abcdef123456789012',
        smartAddress: '0x4567890123def1234567890abcdef123456789012',
        profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      },
    }),
    prisma.user.create({
      data: {
        email: 'brian@email.com',
        userName: 'Brian Otieno',
        phoneNo: 702555666,
        address: '0x5678901234ef1234567890abcdef1234567890123',
        smartAddress: '0x5678901234ef1234567890abcdef1234567890123',
        profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jeff@email.com',
        userName: 'Jeff Admin',
        phoneNo: 703666777,
        address: '0x6789012345f1234567890abcdef12345678901234',
        smartAddress: '0x6789012345f1234567890abcdef12345678901234',
        profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create chamas
  const chamas = await Promise.all([
    // Private chamas (existing ones)
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
        rating: 4,
        blockchainId: '1',
        adminId: users[1].id, // Alice as admin
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
        rating: 5,
        blockchainId: '3',
        adminId: users[3].id, // James as admin
      },
    }),
    
    // Public chamas for discover page
    prisma.chama.create({
      data: {
        name: 'Digital Nomads Savings',
        slug: 'digital-nomads-savings',
        description: 'For remote workers and freelancers building financial security',
        adminTerms: JSON.stringify(['Must be a remote worker or freelancer.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-01-15'),
        payDate: new Date('2025-02-10'),
        cycleTime: 30,
        amount: '8000',
        maxNo: 12,
        rating: 4,
        blockchainId: '4',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Small Business Owners Circle',
        slug: 'small-business-owners-circle',
        description: 'Supporting entrepreneurs and small business growth',
        adminTerms: JSON.stringify(['Must be an entrepreneur or small business owner.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-03-20'),
        payDate: new Date('2025-01-30'),
        cycleTime: 30,
        amount: '15000',
        maxNo: 10,
        rating: 5,
        blockchainId: '5',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Student Loan Repayment Group',
        slug: 'student-loan-repayment-group',
        description: 'Helping students manage and repay their education loans together',
        adminTerms: JSON.stringify(['Must be a student with an education loan.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-02-10'),
        payDate: new Date('2025-06-15'),
        cycleTime: 30,
        amount: '3000',
        maxNo: 15,
        rating: 4,
        blockchainId: '6',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Real Estate Investment Pool',
        slug: 'real-estate-investment-pool',
        description: 'Collective investment in real estate properties and land',
        adminTerms: JSON.stringify(['Must have a real estate property or land to invest in.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-04-05'),
        payDate: new Date('2025-12-20'),
        cycleTime: 30,
        amount: '25000',
        maxNo: 12,
        rating: 4,
        blockchainId: '7',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Tech Startup Founders',
        slug: 'tech-startup-founders',
        description: 'Funding and support for tech startup founders and innovators',
        adminTerms: JSON.stringify(['Must be a tech startup founder or innovator.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-05-12'),
        payDate: new Date('2025-09-10'),
        cycleTime: 30,
        amount: '20000',
        maxNo: 10,
        rating: 4,
        blockchainId: '8',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Healthcare Workers Support',
        slug: 'healthcare-workers-support',
        description: 'Financial support group for healthcare professionals and medical workers',
        adminTerms: JSON.stringify(['Must be a healthcare professional or medical worker.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-06-18'),
        payDate: new Date('2025-08-25'),
        cycleTime: 30,
        amount: '12000',
        maxNo: 12,
        rating: 5,
        blockchainId: '9',
        adminId: users[5].id, // Jeff as admin
      },
    }),
    prisma.chama.create({
      data: {
        name: 'Creative Artists Collective',
        slug: 'creative-artists-collective',
        description: 'Supporting artists, musicians, and creative professionals',
        adminTerms: JSON.stringify(['Must be an artist, musician, or creative professional.', 'Contributions must be made monthly.']),
        type: 'Public',
        startDate: new Date('2024-07-22'),
        payDate: new Date('2025-10-15'),
        cycleTime: 30,
        amount: '6000',
        maxNo: 15,
        rating: 4,
        blockchainId: '10',
        adminId: users[5].id, // Jeff as admin
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
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[1].id, // Alice (admin)
        chamaId: chamas[0].id,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[2].id, // Mary
        chamaId: chamas[0].id,
        payDate: new Date('2024-07-01'),
      },
    }),

    // Family Welfare Chama members
    prisma.chamaMember.create({
      data: {
        userId: users[0].id, // Sarah
        chamaId: chamas[1].id,
        payDate: new Date('2024-07-01'),
      },
    }),
    prisma.chamaMember.create({
      data: {
        userId: users[3].id, // James (admin)
        chamaId: chamas[1].id,
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
        text: 'Welcome to Women Entrepreneurs Chama! Please make sure to contribute by the 30th of each month.',
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

    // Family Welfare Chama messages
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
        senderId: users[3].id, // James (admin)
        text: 'Remember to contribute before the end of the month.',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
        senderId: users[3].id, // James
        text: 'Thank you all for your support!',
      },
    }),
    prisma.message.create({
      data: {
        chamaId: chamas[1].id,
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
    prisma.payment.create({
      data: {
        amount: '5000',
        description: 'Monthly contribution',
        txHash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef123',
        userId: users[2].id,
        chamaId: chamas[0].id,
      },
    }),

    // Family Welfare Chama payments
    prisma.payment.create({
      data: {
        amount: '2000',
        description: 'Monthly contribution',
        txHash: '0x4567890123def1234567890abcdef1234567890abcdef1234567890abcdef1234',
        userId: users[0].id,
        chamaId: chamas[1].id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: '2000',
        description: 'Monthly contribution',
        txHash: '0x5678901234ef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        userId: users[3].id,
        chamaId: chamas[1].id,
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
        message: 'Your turn is coming up in Family Welfare Chama',
        userId: users[0].id,
        chamaId: chamas[1].id,
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
        receiver: users[2].userName || 'Mary Wanjiru',
        userId: users[2].id,
        chamaId: chamas[0].id,
      },
    }),
    prisma.payOut.create({
      data: {
        amount: BigInt(20000),
        txHash: '0x8901234567234567890abcdef1234567890abcdef1234567890abcdef12345678',
        receiver: users[3].userName || 'James Mwangi',
        userId: users[3].id,
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