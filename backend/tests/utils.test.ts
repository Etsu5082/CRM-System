import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/utils/auth';

// Prismaを使用しないテストなのでsetup.tsをインポートしない

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('パスワードをハッシュ化できる', async () => {
      const password = 'Test123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('同じパスワードでも異なるハッシュを生成する', async () => {
      const password = 'Test123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードで検証が成功する', async () => {
      const password = 'Test123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('誤ったパスワードで検証が失敗する', async () => {
      const password = 'Test123!';
      const wrongPassword = 'Wrong123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('強いパスワードが検証を通過する', () => {
      const result = validatePasswordStrength('Test123!');
      expect(result.valid).toBe(true);
    });

    it('短いパスワードが検証に失敗する', () => {
      const result = validatePasswordStrength('Test1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('大文字がないパスワードが検証に失敗する', () => {
      const result = validatePasswordStrength('test123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('小文字がないパスワードが検証に失敗する', () => {
      const result = validatePasswordStrength('TEST123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('数字がないパスワードが検証に失敗する', () => {
      const result = validatePasswordStrength('TestTest!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('特殊文字がないパスワードが検証に失敗する', () => {
      const result = validatePasswordStrength('Test1234');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('special character');
    });
  });
});