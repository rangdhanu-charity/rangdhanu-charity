import { test, expect } from '@playwright/test';

test.describe('Authentication and User Profile', () => {

    const TEST_USERNAME = 'paran';
    const TEST_PASSWORD = 'n95kfr2ldorl';

    test('logging in opens profile page', async ({ page }) => {
        // 1. Go to the login page
        await page.goto('/login');

        // 2. Fill out username and password
        await page.fill('input[type="text"]', TEST_USERNAME);
        await page.fill('input[type="password"]', TEST_PASSWORD);

        // We check the "Login as Admin" box just in case paran is an admin, so it redirects properly
        // Wait, the new logic might redirect to /profile OR /admin depending on user role and the checkbox.
        // Let's just do a standard login first.
        await page.click('button:has-text("Sign In")');

        // 3. Expect URL to become /profile
        await expect(page).toHaveURL(/.*profile/, { timeout: 15000 });

        // 4. Check if profile elements are visible
        await expect(page.locator('text=Personal Overview').first()).toBeVisible();
    });

    test('logging in with invalid credentials shows an error toast', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input[type="text"]', 'definitely_fake_user_123');
        await page.fill('input[type="password"]', 'wrongpassword');

        await page.click('button:has-text("Sign In")');

        const errorToast = page.locator('div[role="alert"]').first();
        await expect(errorToast).toBeVisible({ timeout: 10000 });

        await expect(page).toHaveURL(/.*login/);
    });

    test('clicking Sign up routes to the registration page', async ({ page }) => {
        await page.goto('/login');

        await page.getByRole('link', { name: 'Sign up' }).click();
        await expect(page).toHaveURL(/.*register/);

        await expect(page.locator('h2, h3, div').filter({ hasText: 'Apply for Membership' }).first()).toBeVisible();
    });
});
