import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
    const TEST_USERNAME = 'paran';
    const TEST_PASSWORD = 'n95kfr2ldorl';

    // We do a beforeEach hook to cleanly log in as an admin for all tests in this suite
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="text"]', TEST_USERNAME);
        await page.fill('input[type="password"]', TEST_PASSWORD);

        // Check "Login as Admin"
        // In shadcn, the checkbox might be hidden or custom, so we click the label
        await page.click('label[for="admin-toggle"]');

        await page.click('button:has-text("Sign In")');

        // Check it lands on /admin
        await expect(page).toHaveURL(/.*admin/, { timeout: 15000 });
    });

    test('admin dashboard loads and contains key metrics', async ({ page }) => {
        // Checking if we are on the dashboard
        await expect(page.locator('h2').first()).toContainText(/Dashboard/i);
        // Ensure some cards are visible
        await expect(page.locator('text=Total Collection').first()).toBeVisible();
    });

    test('admin can navigate to collections and users', async ({ page }) => {
        // Use the desktop navigation to go to Collections
        await page.locator('nav.hidden.md\\:flex').getByRole('link', { name: /Admin/ }).click();

        // Since Admin is a single Link in navbar, it might drop us in /admin.
        // Let's use the actual sidebar for Admin panel (if one exists), or we navigate directly if we know the URL
        // Actually, let's just use direct URL navigation to confirm the page renders when authorized
        await page.goto('/admin/collections');
        await expect(page.locator('h1').first()).toContainText(/Collections/i);

        await page.goto('/admin/users');
        await expect(page.locator('h1').first()).toContainText(/Members/i);
    });

    test('admin can navigate to settings', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('h1').first()).toContainText(/Settings/i);
    });
});

