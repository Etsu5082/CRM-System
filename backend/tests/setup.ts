import { PrismaClient } from '@prisma/client';
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// テスト用Prismaクライアント
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db',
    },
  },
});

// テストの前処理
beforeAll(async () => {
  // テストデータベースの接続
  await prisma.$connect();
});

// 各テストの後処理（データクリーンアップ）
afterEach(async () => {
  // 順序を考慮してテーブルをクリア
  const tables = [
    'AuditLog',
    'ApprovalRequest',
    'Task',
    'Meeting',
    'Customer',
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  }
});

// テストの後処理
afterAll(async () => {
  await prisma.$disconnect();
});