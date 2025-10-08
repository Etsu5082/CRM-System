import request from 'supertest';
import express from 'express';
import meetingsRouter from '../../routes/meetings';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../utils/prisma';

// テスト用のExpressアプリケーション作成
const app = express();
app.use(express.json());
app.use('/api/meetings', meetingsRouter);

describe('商談管理API統合テスト', () => {
  let adminToken: string;
  let salesToken: string;
  let adminUserId: string;
  let salesUserId: string;
  let testCustomerId: string;
  let testMeetingId: string;

  beforeAll(async () => {
    // テスト用管理者ユーザー作成
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-meeting@test.com',
        password: 'hashedpassword123',
        name: '管理者（商談テスト）',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // テスト用営業ユーザー作成
    const salesUser = await prisma.user.create({
      data: {
        email: 'sales-meeting@test.com',
        password: 'hashedpassword123',
        name: '営業担当（商談テスト）',
        role: 'SALES',
      },
    });
    salesUserId = salesUser.id;

    // テスト用顧客作成
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'テスト顧客（商談）',
        email: 'customer-meeting@test.com',
        phone: '090-1234-5678',
        company: 'テスト株式会社',
        userId: adminUserId,
      },
    });
    testCustomerId = testCustomer.id;

    // トークン生成（実際のJWT生成ロジックを使用）
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
    await prisma.meeting.deleteMany({
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

  describe('POST /api/meetings - 商談作成', () => {
    it('管理者は商談を作成できる', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '新規商談テスト',
          meetingDate: new Date().toISOString(),
          type: 'FIRST_CONTACT',
          status: 'SCHEDULED',
          notes: 'テスト用の商談です',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('新規商談テスト');
      expect(response.body.data.type).toBe('FIRST_CONTACT');
      testMeetingId = response.body.data.id;
    });

    it('営業担当は商談を作成できる', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: testCustomerId,
          title: '営業商談テスト',
          meetingDate: new Date().toISOString(),
          type: 'FOLLOW_UP',
          status: 'SCHEDULED',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('営業商談テスト');
    });

    it('必須フィールドが不足している場合はエラー', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          // titleが不足
          meetingDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it('認証なしでは商談を作成できない', async () => {
      const response = await request(app).post('/api/meetings').send({
        customerId: testCustomerId,
        title: '認証なし商談',
        meetingDate: new Date().toISOString(),
        type: 'FIRST_CONTACT',
        status: 'SCHEDULED',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/meetings - 商談一覧取得', () => {
    it('管理者は全商談を取得できる', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('顧客IDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ customerId: testCustomerId });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((meeting: any) => {
        expect(meeting.customerId).toBe(testCustomerId);
      });
    });

    it('商談タイプでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'FIRST_CONTACT' });

      expect(response.status).toBe(200);
      response.body.data.forEach((meeting: any) => {
        expect(meeting.type).toBe('FIRST_CONTACT');
      });
    });

    it('ステータスでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'SCHEDULED' });

      expect(response.status).toBe(200);
      response.body.data.forEach((meeting: any) => {
        expect(meeting.status).toBe('SCHEDULED');
      });
    });
  });

  describe('GET /api/meetings/:id - 商談詳細取得', () => {
    it('指定した商談の詳細を取得できる', async () => {
      const response = await request(app)
        .get(`/api/meetings/${testMeetingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMeetingId);
      expect(response.body.data).toHaveProperty('customer');
      expect(response.body.data).toHaveProperty('user');
    });

    it('存在しない商談IDの場合は404エラー', async () => {
      const response = await request(app)
        .get('/api/meetings/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/meetings/:id - 商談更新', () => {
    it('商談情報を更新できる', async () => {
      const response = await request(app)
        .put(`/api/meetings/${testMeetingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '更新後の商談タイトル',
          status: 'COMPLETED',
          notes: '商談が完了しました',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('更新後の商談タイトル');
      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('次回アクション設定でタスクが自動生成される', async () => {
      const nextActionDate = new Date();
      nextActionDate.setDate(nextActionDate.getDate() + 7);

      const response = await request(app)
        .put(`/api/meetings/${testMeetingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nextAction: 'フォローアップ電話',
          nextActionDate: nextActionDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.nextAction).toBe('フォローアップ電話');

      // タスクが作成されたか確認
      const tasks = await prisma.task.findMany({
        where: {
          title: { contains: 'フォローアップ電話' },
          customerId: testCustomerId,
        },
      });
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('存在しない商談は更新できない', async () => {
      const response = await request(app)
        .put('/api/meetings/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '更新テスト',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/meetings/:id - 商談削除', () => {
    it('管理者は商談を削除できる', async () => {
      // 削除用の商談を作成
      const createResponse = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '削除テスト商談',
          meetingDate: new Date().toISOString(),
          type: 'OTHER',
          status: 'SCHEDULED',
        });
      const meetingToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/meetings/${meetingToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 削除確認
      const checkResponse = await request(app)
        .get(`/api/meetings/${meetingToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkResponse.status).toBe(404);
    });

    it('存在しない商談は削除できない', async () => {
      const response = await request(app)
        .delete('/api/meetings/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/meetings/upcoming - 今後の商談取得', () => {
    it('今後の商談を取得できる', async () => {
      // 未来の商談を作成
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '未来の商談',
          meetingDate: futureDate.toISOString(),
          type: 'FOLLOW_UP',
          status: 'SCHEDULED',
        });

      const response = await request(app)
        .get('/api/meetings/upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な顧客IDで商談を作成するとエラー', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: 'invalid-customer-id',
          title: '無効な顧客ID',
          meetingDate: new Date().toISOString(),
          type: 'FIRST_CONTACT',
          status: 'SCHEDULED',
        });

      expect(response.status).toBe(400);
    });

    it('無効な日付形式はエラー', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          title: '無効な日付',
          meetingDate: 'invalid-date',
          type: 'FIRST_CONTACT',
          status: 'SCHEDULED',
        });

      expect(response.status).toBe(400);
    });
  });
});
