import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create users
  const adminPassword = await hashPassword('Admin123!');
  const managerPassword = await hashPassword('Manager123!');
  const salesPassword = await hashPassword('Sales123!');
  const compliancePassword = await hashPassword('Compliance123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: '管理者太郎',
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      name: 'マネージャー花子',
      role: 'MANAGER',
    },
  });

  const sales1 = await prisma.user.upsert({
    where: { email: 'sales1@example.com' },
    update: {},
    create: {
      email: 'sales1@example.com',
      password: salesPassword,
      name: '営業一郎',
      role: 'SALES',
    },
  });

  const sales2 = await prisma.user.upsert({
    where: { email: 'sales2@example.com' },
    update: {},
    create: {
      email: 'sales2@example.com',
      password: salesPassword,
      name: '営業次郎',
      role: 'SALES',
    },
  });

  const compliance = await prisma.user.upsert({
    where: { email: 'compliance@example.com' },
    update: {},
    create: {
      email: 'compliance@example.com',
      password: compliancePassword,
      name: 'コンプライアンス三郎',
      role: 'COMPLIANCE',
    },
  });

  console.log('✅ Users created');

  // Create customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'tanaka@example.com' },
    update: {},
    create: {
      name: '田中太郎',
      email: 'tanaka@example.com',
      phone: '03-1234-5678',
      address: '東京都千代田区1-1-1',
      investmentProfile: 'conservative',
      riskTolerance: 3,
      investmentExperience: '5年',
      assignedSalesId: sales1.id,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'suzuki@example.com' },
    update: {},
    create: {
      name: '鈴木花子',
      email: 'suzuki@example.com',
      phone: '03-2345-6789',
      address: '東京都港区2-2-2',
      investmentProfile: 'moderate',
      riskTolerance: 5,
      investmentExperience: '3年',
      assignedSalesId: sales1.id,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { email: 'sato@example.com' },
    update: {},
    create: {
      name: '佐藤一郎',
      email: 'sato@example.com',
      phone: '03-3456-7890',
      address: '東京都渋谷区3-3-3',
      investmentProfile: 'aggressive',
      riskTolerance: 8,
      investmentExperience: '10年',
      assignedSalesId: sales2.id,
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { email: 'yamada@example.com' },
    update: {},
    create: {
      name: '山田美咲',
      email: 'yamada@example.com',
      phone: '03-4567-8901',
      address: '東京都新宿区4-4-4',
      investmentProfile: 'moderate',
      riskTolerance: 6,
      investmentExperience: '7年',
      assignedSalesId: sales2.id,
    },
  });

  console.log('✅ Customers created');

  // Create meetings
  await prisma.meeting.create({
    data: {
      customerId: customer1.id,
      salesId: sales1.id,
      date: new Date('2025-09-25'),
      summary: '初回面談を実施。投資目標や資産状況をヒアリング。保守的な運用を希望。',
      nextAction: '低リスクファンドの提案資料を作成',
      nextActionDate: new Date('2025-10-05'),
    },
  });

  await prisma.meeting.create({
    data: {
      customerId: customer2.id,
      salesId: sales1.id,
      date: new Date('2025-09-28'),
      summary: 'ポートフォリオ見直し面談。現在の運用状況を確認し、リバランスを提案。',
      nextAction: 'リバランス提案書の作成と承認申請',
      nextActionDate: new Date('2025-10-08'),
    },
  });

  await prisma.meeting.create({
    data: {
      customerId: customer3.id,
      salesId: sales2.id,
      date: new Date('2025-09-27'),
      summary: '新規投資商品の提案。高リスク高リターンの商品に興味あり。',
      nextAction: '商品詳細資料の送付と次回面談設定',
      nextActionDate: new Date('2025-10-10'),
    },
  });

  console.log('✅ Meetings created');

  // Create tasks
  await prisma.task.create({
    data: {
      userId: sales1.id,
      customerId: customer1.id,
      title: '次回アクション: 田中太郎',
      description: '低リスクファンドの提案資料を作成',
      dueDate: new Date('2025-10-05'),
      status: 'TODO',
      priority: 'MEDIUM',
    },
  });

  await prisma.task.create({
    data: {
      userId: sales1.id,
      customerId: customer2.id,
      title: '次回アクション: 鈴木花子',
      description: 'リバランス提案書の作成と承認申請',
      dueDate: new Date('2025-10-08'),
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });

  await prisma.task.create({
    data: {
      userId: sales2.id,
      customerId: customer3.id,
      title: '次回アクション: 佐藤一郎',
      description: '商品詳細資料の送付と次回面談設定',
      dueDate: new Date('2025-10-10'),
      status: 'TODO',
      priority: 'MEDIUM',
    },
  });

  await prisma.task.create({
    data: {
      userId: sales1.id,
      title: '月次レポート作成',
      description: '9月の営業活動レポートを作成',
      dueDate: new Date('2025-09-28'),
      status: 'TODO',
      priority: 'URGENT',
    },
  });

  await prisma.task.create({
    data: {
      userId: sales2.id,
      customerId: customer4.id,
      title: '山田様フォローアップ',
      description: '前回提案商品の検討状況確認',
      dueDate: new Date('2025-10-03'),
      status: 'TODO',
      priority: 'LOW',
    },
  });

  console.log('✅ Tasks created');

  // Create approval requests
  await prisma.approvalRequest.create({
    data: {
      customerId: customer2.id,
      requesterId: sales1.id,
      productName: 'バランス型投資信託A',
      amount: 5000000,
      comment: '顧客のリスク許容度に合わせたバランス型ファンドを提案します。',
      status: 'PENDING',
    },
  });

  await prisma.approvalRequest.create({
    data: {
      customerId: customer3.id,
      requesterId: sales2.id,
      productName: 'グロース株式ファンドB',
      amount: 10000000,
      comment: '高成長が期待できる株式中心のファンドです。顧客の投資経験も豊富です。',
      status: 'PENDING',
    },
  });

  await prisma.approvalRequest.create({
    data: {
      customerId: customer1.id,
      requesterId: sales1.id,
      productName: '債券型ファンドC',
      amount: 3000000,
      comment: '安定運用を希望されているため、債券中心の低リスク商品を提案します。',
      status: 'APPROVED',
      approverId: manager.id,
      processedAt: new Date('2025-09-29'),
    },
  });

  console.log('✅ Approval requests created');

  console.log('🎉 Database seeding completed!');
  console.log('\n📝 Test accounts:');
  console.log('Admin:      admin@example.com      / Admin123!');
  console.log('Manager:    manager@example.com    / Manager123!');
  console.log('Sales:      sales1@example.com     / Sales123!');
  console.log('Sales:      sales2@example.com     / Sales123!');
  console.log('Compliance: compliance@example.com / Compliance123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });