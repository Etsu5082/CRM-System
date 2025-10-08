import request from 'supertest';
import express from 'express';
import reportsRouter from '../../routes/reports';
import { prisma } from '../../utils/prisma';

// テスト用のExpressアプリケーション作成
const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

describe('レポートAPI統合テスト', () => {
  let adminToken: string;
  let salesToken: string;
  let adminUserId: string;
  let salesUserId: string;
  let testCustomerId: string;
  let testMeetingId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // テスト用管理者ユーザー作成
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-report@test.com',
        password: 'hashedpassword123',
        name: '管理者（レポートテスト）',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // テスト用営業ユーザー作成
    const salesUser = await prisma.user.create({
      data: {
        email: 'sales-report@test.com',
        password: 'hashedpassword123',
        name: '営業担当（レポートテスト）',
        role: 'SALES',
      },
    });
    salesUserId = salesUser.id;

    // テスト用顧客作成
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'テスト顧客（レポート）',
        email: 'customer-report@test.com',
        phone: '090-1234-5678',
        company: 'テスト株式会社',
        userId: salesUserId,
      },
    });
    testCustomerId = testCustomer.id;

    // テスト用商談作成
    const testMeeting = await prisma.meeting.create({
      data: {
        customerId: testCustomerId,
        userId: salesUserId,
        title: 'テスト商談',
        meetingDate: new Date(),
        type: 'FIRST_CONTACT',
        status: 'COMPLETED',
        notes: 'テスト用の商談です',
      },
    });
    testMeetingId = testMeeting.id;

    // テスト用タスク作成
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const testTask = await prisma.task.create({
      data: {
        customerId: testCustomerId,
        userId: salesUserId,
        title: 'テストタスク',
        dueDate: dueDate,
        priority: 'HIGH',
        status: 'TODO',
      },
    });
    testTaskId = testTask.id;

    // トークン生成
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminUserId, email: adminUser.email, role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    salesToken = jwt.sign(
      { id: salesUserId, email: salesUser.email, role: 'SALES' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await prisma.task.deleteMany({
      where: { userId: salesUserId },
    });
    await prisma.meeting.deleteMany({
      where: { userId: salesUserId },
    });
    await prisma.customer.deleteMany({
      where: { userId: salesUserId },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: adminUserId }, { id: salesUserId }],
      },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/reports/dashboard - ダッシュボードレポート取得', () => {
    it('管理者はダッシュボードレポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCustomers');
      expect(response.body.data).toHaveProperty('totalMeetings');
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('overdueTasks');
      expect(response.body.data).toHaveProperty('completedTasksThisMonth');
    });

    it('営業担当はダッシュボードレポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('認証なしではダッシュボードレポートを取得できない', async () => {
      const response = await request(app).get('/api/reports/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/sales - 営業レポート取得', () => {
    it('管理者は営業レポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMeetings');
      expect(response.body.data).toHaveProperty('meetingsByType');
      expect(response.body.data).toHaveProperty('meetingsByStatus');
      expect(Array.isArray(response.body.data.meetingsByType)).toBe(true);
    });

    it('期間指定でフィルタリングできる', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('ユーザーIDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: salesUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('営業担当は自分の営業レポートのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/tasks - タスクレポート取得', () => {
    it('管理者はタスクレポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('tasksByStatus');
      expect(response.body.data).toHaveProperty('tasksByPriority');
      expect(response.body.data).toHaveProperty('overdueTasks');
      expect(Array.isArray(response.body.data.tasksByStatus)).toBe(true);
      expect(Array.isArray(response.body.data.tasksByPriority)).toBe(true);
    });

    it('期間指定でフィルタリングできる', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('ユーザーIDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/reports/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: salesUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('営業担当は自分のタスクレポートのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/tasks')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/customers - 顧客レポート取得', () => {
    it('管理者は顧客レポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCustomers');
      expect(response.body.data).toHaveProperty('newCustomersThisMonth');
      expect(response.body.data).toHaveProperty('customersByUser');
      expect(Array.isArray(response.body.data.customersByUser)).toBe(true);
    });

    it('期間指定でフィルタリングできる', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('ユーザーIDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/reports/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: salesUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('営業担当は自分の顧客レポートのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/customers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/activity - アクティビティレポート取得', () => {
    it('管理者はアクティビティレポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalActivities');
      expect(response.body.data).toHaveProperty('activitiesByType');
      expect(Array.isArray(response.body.data.activitiesByType)).toBe(true);
    });

    it('期間指定でフィルタリングできる', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('ユーザーIDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/reports/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: salesUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/performance - パフォーマンスレポート取得', () => {
    it('管理者はパフォーマンスレポートを取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/performance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userPerformance');
      expect(Array.isArray(response.body.data.userPerformance)).toBe(true);
    });

    it('期間指定でフィルタリングできる', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/reports/performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('営業担当は自分のパフォーマンスレポートのみ取得できる', async () => {
      const response = await request(app)
        .get('/api/reports/performance')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reports/export - レポートエクスポート', () => {
    it('管理者はレポートをCSV形式でエクスポートできる', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'customers', format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('管理者はレポートをJSON形式でエクスポートできる', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'tasks', format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('無効なレポートタイプはエラー', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'invalid-type', format: 'csv' });

      expect(response.status).toBe(400);
    });

    it('無効なフォーマットはエラー', async () => {
      const response = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'customers', format: 'invalid-format' });

      expect(response.status).toBe(400);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な日付形式はエラー', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: 'invalid-date',
          endDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('開始日が終了日より後の場合はエラー', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 7);

      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('無効なユーザーIDはエラー', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: 'invalid-user-id' });

      expect(response.status).toBe(400);
    });
  });
});
