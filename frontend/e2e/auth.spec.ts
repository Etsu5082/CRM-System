import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('証券CRM');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
  });

  test('should successfully login with admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード').fill('Admin123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('ダッシュボード');
  });

  test('should fail login with wrong credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // Should show error message
    await expect(page.getByText(/ログインに失敗しました|Invalid credentials/)).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: '新規登録' }).click();

    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('アカウント作成');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード').fill('Admin123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: 'ログアウト' }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
});

test.describe('User Registration', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h1')).toContainText('アカウント作成');
    await expect(page.getByLabel('名前')).toBeVisible();
    await expect(page.getByLabel('メールアドレス')).toBeVisible();
    await expect(page.getByLabel('パスワード')).toBeVisible();
  });

  test('should show password validation errors', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('名前').fill('Test User');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('123');
    await page.getByLabel('確認用パスワード').fill('123');
    await page.getByRole('button', { name: 'アカウント作成' }).click();

    await expect(page.getByText(/パスワードは8文字以上/)).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('名前').fill('Test User');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('Password123!');
    await page.getByLabel('確認用パスワード').fill('DifferentPassword123!');
    await page.getByRole('button', { name: 'アカウント作成' }).click();

    await expect(page.getByText('パスワードが一致しません')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected routes without authentication', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');

    await page.goto('/dashboard/customers');
    await expect(page).toHaveURL('/login');

    await page.goto('/dashboard/tasks');
    await expect(page).toHaveURL('/login');
  });

  test('should access dashboard after successful login', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード').fill('Admin123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Should be able to access other protected routes
    await page.goto('/dashboard/customers');
    await expect(page).toHaveURL('/dashboard/customers');
  });
});
