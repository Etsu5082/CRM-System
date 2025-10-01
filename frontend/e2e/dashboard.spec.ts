import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード').fill('Admin123!');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();

    // Check for dashboard cards
    await expect(page.getByRole('heading', { name: '顧客管理' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '商談履歴' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();
  });

  test('should navigate to customers page', async ({ page }) => {
    await page.getByRole('button', { name: '顧客一覧へ' }).click();
    await expect(page).toHaveURL('/dashboard/customers');
  });

  test('should navigate to tasks page', async ({ page }) => {
    await page.getByRole('button', { name: 'タスク一覧へ' }).click();
    await expect(page).toHaveURL('/dashboard/tasks');
  });

  test('should navigate to meetings page', async ({ page }) => {
    await page.getByRole('button', { name: '商談一覧へ' }).click();
    await expect(page).toHaveURL('/dashboard/meetings');
  });
});

test.describe('Dashboard - Compliance Role', () => {
  test.beforeEach(async ({ page }) => {
    // Login as compliance user
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('compliance@example.com');
    await page.getByLabel('パスワード').fill('Compliance123!');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('should display audit log card for compliance role', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '監査ログ' })).toBeVisible();
  });

  test('should navigate to audit log page', async ({ page }) => {
    await page.getByRole('button', { name: 'ログ一覧へ' }).click();
    await expect(page).toHaveURL('/dashboard/audit');
  });
});
