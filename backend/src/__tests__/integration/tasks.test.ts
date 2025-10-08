import request from 'supertest';
import express from 'express';
import tasksRouter from '../../routes/tasks';
import { prisma } from '../../utils/prisma';

// テスト用のExpressアプリケーション作成
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('タスク管理API統合テスト', () => {
  let adminToken: string;
  let salesToken: string;
  let adminUserId: string;
  let salesUserId: string;
  let testCustomerId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // テスト用管理者ユーザー作成
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-task@test.com',
        password: 'hashedpassword123',
        name: '管理者（タスクテスト）',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // テスト用営業ユーザー作成
    const salesUser = await prisma.user.create({
      data: {
        email: 'sales-task@test.com',
        password: 'hashedpassword123',
        name: '営業担当（タスクテスト）',
        role: 'SALES',
      },
    });
    salesUserId = salesUser.id;

    // テスト用顧客作成
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'テスト顧客（タスク）',
        email: 'customer-task@test.com',
        phone: '090-1234-5678',
        company: 'テスト株式会社',
        userId: adminUserId,
      },
    });
    testCustomerId = testCustomer.id;

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
      where: {
        OR: [{ userId: adminUserId }, { userId: salesUserId }],
      },
    });
    await prisma.customer.deleteMany({
      where: { userId: adminUserId },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: adminUserId }, { id: salesUserId }],
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/tasks - タスク作成', () => {
    it('管理者はタスクを作成できる', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '新規タスクテスト',
          description: 'テスト用のタスクです',
          dueDate: dueDate.toISOString(),
          priority: 'HIGH',
          status: 'TODO',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('新規タスクテスト');
      expect(response.body.data.priority).toBe('HIGH');
      testTaskId = response.body.data.id;
    });

    it('営業担当はタスクを作成できる', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: testCustomerId,
          title: '営業タスクテスト',
          dueDate: dueDate.toISOString(),
          priority: 'MEDIUM',
          status: 'TODO',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('営業タスクテスト');
    });

    it('必須フィールドが不足している場合はエラー', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          // titleが不足
          dueDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('認証なしではタスクを作成できない', async () => {
      const response = await request(app).post('/api/tasks').send({
        customerId: testCustomerId,
        title: '認証なしタスク',
        dueDate: new Date().toISOString(),
        priority: 'LOW',
        status: 'TODO',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tasks - タスク一覧取得', () => {
    it('管理者は全タスクを取得できる', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('顧客IDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ customerId: testCustomerId });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((task: any) => {
        expect(task.customerId).toBe(testCustomerId);
      });
    });

    it('ステータスでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'TODO' });

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe('TODO');
      });
    });

    it('優先度でフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: 'HIGH' });

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.priority).toBe('HIGH');
      });
    });
  });

  describe('GET /api/tasks/:id - タスク詳細取得', () => {
    it('指定したタスクの詳細を取得できる', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTaskId);
      expect(response.body.data).toHaveProperty('customer');
      expect(response.body.data).toHaveProperty('user');
    });

    it('存在しないタスクIDの場合は404エラー', async () => {
      const response = await request(app)
        .get('/api/tasks/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id - タスク更新', () => {
    it('タスク情報を更新できる', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '更新後のタスクタイトル',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          description: 'タスクを更新しました',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('更新後のタスクタイトル');
      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.priority).toBe('URGENT');
    });

    it('期限を更新できる', async () => {
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 14);

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dueDate: newDueDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(new Date(response.body.data.dueDate)).toEqual(newDueDate);
    });

    it('存在しないタスクは更新できない', async () => {
      const response = await request(app)
        .put('/api/tasks/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '更新テスト',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id/complete - タスク完了', () => {
    it('タスクを完了できる', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('完了済みタスクは再度完了できる（冪等性）', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('存在しないタスクは完了できない', async () => {
      const response = await request(app)
        .put('/api/tasks/nonexistent-id/complete')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id - タスク削除', () => {
    it('管理者はタスクを削除できる', async () => {
      // 削除用のタスクを作成
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '削除テストタスク',
          dueDate: new Date().toISOString(),
          priority: 'LOW',
          status: 'TODO',
        });
      const taskToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/tasks/${taskToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 削除確認
      const checkResponse = await request(app)
        .get(`/api/tasks/${taskToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkResponse.status).toBe(404);
    });

    it('存在しないタスクは削除できない', async () => {
      const response = await request(app)
        .delete('/api/tasks/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/overdue - 期限切れタスク取得', () => {
    it('期限切れタスクを取得できる', async () => {
      // 過去の期限のタスクを作成
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '期限切れタスク',
          dueDate: pastDate.toISOString(),
          priority: 'HIGH',
          status: 'TODO',
        });

      const response = await request(app)
        .get('/api/tasks/overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tasks/upcoming - 期限間近タスク取得', () => {
    it('期限間近（3日以内）のタスクを取得できる', async () => {
      // 2日後のタスクを作成
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '期限間近タスク',
          dueDate: soonDate.toISOString(),
          priority: 'MEDIUM',
          status: 'TODO',
        });

      const response = await request(app)
        .get('/api/tasks/upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('完了済みタスクは期限間近リストに含まれない', async () => {
      const response = await request(app)
        .get('/api/tasks/upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((task: any) => {
        expect(task.status).not.toBe('COMPLETED');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な顧客IDでタスクを作成するとエラー', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: 'invalid-customer-id',
          title: '無効な顧客ID',
          dueDate: new Date().toISOString(),
          priority: 'LOW',
          status: 'TODO',
        });

      expect(response.status).toBe(400);
    });

    it('無効な日付形式はエラー', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '無効な日付',
          dueDate: 'invalid-date',
          priority: 'LOW',
          status: 'TODO',
        });

      expect(response.status).toBe(400);
    });

    it('無効な優先度はエラー', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '無効な優先度',
          dueDate: new Date().toISOString(),
          priority: 'INVALID_PRIORITY',
          status: 'TODO',
        });

      expect(response.status).toBe(400);
    });

    it('無効なステータスはエラー', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '無効なステータス',
          dueDate: new Date().toISOString(),
          priority: 'LOW',
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
    });
  });
});
