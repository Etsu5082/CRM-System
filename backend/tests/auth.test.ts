import request from 'supertest';
import express, { Application } from 'express';
import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import authRoutes from '../src/routes/auth';
import { prisma } from './setup';
import { hashPassword } from '../src/utils/auth';

// Express アプリケーションのセットアップ
let app: Application;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('新規ユーザーを正常に登録できる', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
          name: 'テストユーザー',
          role: 'SALES',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.name).toBe('テストユーザー');
      expect(response.body.data.user.role).toBe('SALES');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('無効なメールアドレスで登録に失敗する', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!',
          name: 'テストユーザー',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('弱いパスワードで登録に失敗する', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak',
          name: 'テストユーザー',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('重複したメールアドレスで登録に失敗する', async () => {
      // 最初のユーザーを作成
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Test123!',
          name: 'ユーザー1',
        });

      // 同じメールアドレスで再度登録
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Test123!',
          name: 'ユーザー2',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });

    it('roleを指定しない場合はSALESがデフォルトになる', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'norole@example.com',
          password: 'Test123!',
          name: 'テストユーザー',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('SALES');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      const hashedPassword = await hashPassword('Test123!');
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          name: 'ログインテストユーザー',
          role: 'SALES',
        },
      });
    });

    it('正しい認証情報でログインできる', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('誤ったパスワードでログインに失敗する', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('存在しないメールアドレスでログインに失敗する', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('無効なメールアドレス形式でバリデーションエラー', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Test123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('ログイン時に監査ログが作成される', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!',
        });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'LOGIN',
          resourceType: 'User',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('LOGIN');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // テストユーザーを作成してログイン
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me@example.com',
          password: 'Test123!',
          name: 'Me テストユーザー',
          role: 'MANAGER',
        });

      token = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('認証済みユーザーの情報を取得できる', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('me@example.com');
      expect(response.body.data.name).toBe('Me テストユーザー');
      expect(response.body.data.role).toBe('MANAGER');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('認証トークンなしでアクセスすると401エラー', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('無効な認証トークンでアクセスすると401エラー', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      // テストユーザーを作成してログイン
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'Test123!',
          name: 'Logout テストユーザー',
        });

      token = response.body.data.token;
    });

    it('認証済みユーザーがログアウトできる', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('ログアウト時に監査ログが作成される', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'LOGOUT',
          resourceType: 'User',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('LOGOUT');
    });

    it('認証トークンなしでログアウトすると401エラー', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});