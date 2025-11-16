import { test, expect } from '@playwright/test';

const supabaseAuthRoute = /https:\/\/.*\.supabase\.co\/auth\/v1\/user.*/;
const functionsRoute = /https:\/\/.*\.supabase\.co\/functions\/v1\/make-server-.*\/(.*)/;

const mockUser = { id: 'user-e2e', email: 'e2e@example.com', user_metadata: { name: 'E2E ユーザー' } };
const mockStats = { stats: { totalQuizzes: 3, totalCorrect: 2, totalAnswers: 5 }, user: { id: 'user-e2e', email: 'e2e@example.com', name: 'E2E ユーザー', createdAt: '' } };
const mockQuizzes = { quizzes: [ { id: 'q1', question: 'Q1?', answer: 'A1', explanation: 'E1', type: 'text', subject: '社会', unit: '単元', difficulty: 1 } ] };
const mockHistory = { history: [ null, { quizId: 'q1', isCorrect: true } ] };

// Inject token before any script runs
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { window.localStorage.setItem('accessToken', 'e2e-token'); });
});

async function setupRoutes(page) {
  await page.route(supabaseAuthRoute, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
  });
  await page.route(functionsRoute, async route => {
    const url = route.request().url();
    if (url.endsWith('/stats')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) });
    if (url.includes('/quizzes')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockQuizzes) });
    if (url.endsWith('/history')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockHistory) });
    return route.continue();
  });
}

test('smoke: stats → list → detail → back', async ({ page }) => {
  await setupRoutes(page);
  await page.goto('/');
  await expect(page.getByText('あなたの統計')).toBeVisible();
  await page.getByRole('button', { name: 'クイズ一覧を見る' }).click();
  await expect(page.getByText('クイズ一覧')).toBeVisible();
  await expect(page.getByText('Q1?')).toBeVisible();
  await page.getByText('Q1?').click();
  await expect(page.getByText('クイズ詳細')).toBeVisible();
  await expect(page.getByText('A1')).toBeVisible();
  await page.getByRole('button', { name: '一覧へ戻る' }).click();
  await expect(page.getByText('クイズ一覧')).toBeVisible();
  await page.getByRole('button', { name: '統計へ戻る' }).click();
  await expect(page.getByText('あなたの統計')).toBeVisible();
});
