import request from 'supertest';
import express from 'express';
import approvalsRouter from '../../routes/approvals';
import { prisma } from '../../utils/prisma';

// テスト用のExpressアプリケーション作成
const app = express();
app.use(express.json());
app.use('/api/approvals', approvalsRouter);

describe('承認ワークフローAPI統合テスト', () => {
  let adminToken: string;
  let salesToken: string;
  let complianceToken: string;
  let adminUserId: string;
  let salesUserId: string;
  let complianceUserId: string;
  let testCustomerId: string;
  let testApprovalId: string;

  beforeAll(async () => {
    // テスト用管理者ユーザー作成
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-approval@test.com',
        password: 'hashedpassword123',
        name: '管理者（承認テスト）',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // テスト用営業ユーザー作成
    const salesUser = await prisma.user.create({
      data: {
        email: 'sales-approval@test.com',
        password: 'hashedpassword123',
        name: '営業担当（承認テスト）',
        role: 'SALES',
      },
    });
    salesUserId = salesUser.id;

    // テスト用コンプライアンスユーザー作成
    const complianceUser = await prisma.user.create({
      data: {
        email: 'compliance-approval@test.com',
        password: 'hashedpassword123',
        name: 'コンプライアンス（承認テスト）',
        role: 'COMPLIANCE',
      },
    });
    complianceUserId = complianceUser.id;

    // テスト用顧客作成
    const testCustomer = await prisma.customer.create({
      data: {
        name: 'テスト顧客（承認）',
        email: 'customer-approval@test.com',
        phone: '090-1234-5678',
        company: 'テスト株式会社',
        userId: salesUserId,
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
    complianceToken = jwt.sign(
      { id: complianceUserId, email: complianceUser.email, role: 'COMPLIANCE' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await prisma.approval.deleteMany({
      where: {
        OR: [
          { requestorId: salesUserId },
          { approverId: adminUserId },
          { approverId: complianceUserId },
        ],
      },
    });
    await prisma.customer.deleteMany({
      where: { userId: salesUserId },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: adminUserId }, { id: salesUserId }, { id: complianceUserId }],
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/approvals - 承認申請作成', () => {
    it('営業担当は承認申請を作成できる', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '新規顧客開拓承認申請',
          description: '大口顧客の新規開拓について承認をお願いします',
          type: 'NEW_CUSTOMER',
          customerId: testCustomerId,
          approverId: adminUserId,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('新規顧客開拓承認申請');
      expect(response.body.data.status).toBe('PENDING');
      testApprovalId = response.body.data.id;
    });

    it('管理者も承認申請を作成できる', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '特別取引承認申請',
          description: '特別条件での取引承認',
          type: 'SPECIAL_DEAL',
          customerId: testCustomerId,
          approverId: complianceUserId,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PENDING');
    });

    it('必須フィールドが不足している場合はエラー', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: 'テスト申請',
          // descriptionとapprov erIdが不足
          type: 'NEW_CUSTOMER',
        });

      expect(response.status).toBe(400);
    });

    it('認証なしでは承認申請を作成できない', async () => {
      const response = await request(app).post('/api/approvals').send({
        title: '認証なし申請',
        description: 'テスト',
        type: 'NEW_CUSTOMER',
        approverId: adminUserId,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/approvals - 承認申請一覧取得', () => {
    it('ユーザーは関連する承認申請を取得できる', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('ステータスでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'PENDING' });

      expect(response.status).toBe(200);
      response.body.data.forEach((approval: any) => {
        expect(approval.status).toBe('PENDING');
      });
    });

    it('申請タイプでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .query({ type: 'NEW_CUSTOMER' });

      expect(response.status).toBe(200);
      response.body.data.forEach((approval: any) => {
        expect(approval.type).toBe('NEW_CUSTOMER');
      });
    });

    it('顧客IDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ customerId: testCustomerId });

      expect(response.status).toBe(200);
      response.body.data.forEach((approval: any) => {
        expect(approval.customerId).toBe(testCustomerId);
      });
    });
  });

  describe('GET /api/approvals/:id - 承認申請詳細取得', () => {
    it('指定した承認申請の詳細を取得できる', async () => {
      const response = await request(app)
        .get(`/api/approvals/${testApprovalId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testApprovalId);
      expect(response.body.data).toHaveProperty('requestor');
      expect(response.body.data).toHaveProperty('approver');
    });

    it('存在しない承認申請IDの場合は404エラー', async () => {
      const response = await request(app)
        .get('/api/approvals/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/approvals/:id/approve - 承認実行', () => {
    it('承認者は申請を承認できる', async () => {
      const response = await request(app)
        .put(`/api/approvals/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          comments: '承認します。良い提案です。',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.reviewedAt).toBeDefined();
      expect(response.body.data.comments).toBe('承認します。良い提案です。');
    });

    it('承認済み申請は再承認できない', async () => {
      const response = await request(app)
        .put(`/api/approvals/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          comments: '再承認テスト',
        });

      expect(response.status).toBe(400);
    });

    it('承認者でないユーザーは承認できない', async () => {
      // 別の承認申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '承認権限テスト',
          description: 'テスト用',
          type: 'OTHER',
          approverId: adminUserId,
        });
      const newApprovalId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${newApprovalId}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          comments: '権限なし承認テスト',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/approvals/:id/reject - 却下実行', () => {
    it('承認者は申請を却下できる', async () => {
      // 却下用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '却下テスト申請',
          description: 'テスト用の申請',
          type: 'NEW_CUSTOMER',
          approverId: adminUserId,
        });
      const approvalToReject = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${approvalToReject}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          comments: '条件が不十分なため却下します',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.reviewedAt).toBeDefined();
      expect(response.body.data.comments).toBe('条件が不十分なため却下します');
    });

    it('却下時のコメントは必須', async () => {
      // 却下用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: 'コメント必須テスト',
          description: 'テスト用',
          type: 'OTHER',
          approverId: adminUserId,
        });
      const approvalId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // commentsなし
        });

      expect(response.status).toBe(400);
    });

    it('承認者でないユーザーは却下できない', async () => {
      // 却下用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '却下権限テスト',
          description: 'テスト用',
          type: 'OTHER',
          approverId: adminUserId,
        });
      const approvalId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${approvalId}/reject`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          comments: '権限なし却下テスト',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/approvals/:id - 承認申請更新', () => {
    it('申請者は自分の申請を更新できる', async () => {
      // 更新用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '更新テスト申請',
          description: '更新前の説明',
          type: 'NEW_CUSTOMER',
          approverId: adminUserId,
        });
      const approvalToUpdate = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${approvalToUpdate}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '更新後のタイトル',
          description: '更新後の説明',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('更新後のタイトル');
      expect(response.body.data.description).toBe('更新後の説明');
    });

    it('承認済み申請は更新できない', async () => {
      const response = await request(app)
        .put(`/api/approvals/${testApprovalId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '承認済み更新テスト',
        });

      expect(response.status).toBe(400);
    });

    it('他人の申請は更新できない', async () => {
      // 管理者が作成した申請を営業が更新しようとする
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '他人の申請',
          description: 'テスト用',
          type: 'OTHER',
          approverId: complianceUserId,
        });
      const otherApprovalId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/approvals/${otherApprovalId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '他人の申請更新テスト',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/approvals/:id - 承認申請削除', () => {
    it('申請者は自分の未承認申請を削除できる', async () => {
      // 削除用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '削除テスト申請',
          description: 'テスト用',
          type: 'OTHER',
          approverId: adminUserId,
        });
      const approvalToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/approvals/${approvalToDelete}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 削除確認
      const checkResponse = await request(app)
        .get(`/api/approvals/${approvalToDelete}`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(checkResponse.status).toBe(404);
    });

    it('管理者は任意の申請を削除できる', async () => {
      // 削除用の申請を作成
      const createResponse = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '管理者削除テスト',
          description: 'テスト用',
          type: 'OTHER',
          approverId: adminUserId,
        });
      const approvalToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/approvals/${approvalToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('存在しない申請は削除できない', async () => {
      const response = await request(app)
        .delete('/api/approvals/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/approvals/pending - 承認待ち一覧取得', () => {
    it('承認者は自分が承認者の未承認申請を取得できる', async () => {
      // 承認待ち申請を作成
      await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '承認待ちテスト1',
          description: 'テスト用',
          type: 'NEW_CUSTOMER',
          approverId: complianceUserId,
        });

      const response = await request(app)
        .get('/api/approvals/pending')
        .set('Authorization', `Bearer ${complianceToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((approval: any) => {
        expect(approval.status).toBe('PENDING');
        expect(approval.approverId).toBe(complianceUserId);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な承認者IDで申請を作成するとエラー', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '無効な承認者',
          description: 'テスト用',
          type: 'NEW_CUSTOMER',
          approverId: 'invalid-approver-id',
        });

      expect(response.status).toBe(400);
    });

    it('無効な申請タイプはエラー', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          title: '無効なタイプ',
          description: 'テスト用',
          type: 'INVALID_TYPE',
          approverId: adminUserId,
        });

      expect(response.status).toBe(400);
    });
  });
});
