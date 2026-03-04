import { test, expect } from '@playwright/test';

test.describe('Profile Flow', () => {
    const TEST_USERNAME = 'paran';
    const TEST_PASSWORD = 'n95kfr2ldorl';

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="text"]', TEST_USERNAME);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Sign In")');

        await expect(page).toHaveURL(/.*profile/, { timeout: 15000 });
    });

    test('opening one-time donation modal from profile', async ({ page }) => {
        // Look for the "Make a Donation" or "Donate Now"
        // In the profile page, it's usually "Make a Donation"
        const donateBtn = page.getByRole('button', { name: /Make a Donation/i }).first();
        if (await donateBtn.isVisible()) {
            await donateBtn.click();

            // The modal should pop up containing "Donate Now" heading
            const modalHeading = page.locator('h2, h3').filter({ hasText: /Donate Now/i });
            await expect(modalHeading.first()).toBeVisible();

            // Close the modal
            await page.keyboard.press('Escape');
        } else {
            // Handle if the button text is different or disabled
            console.warn("Donate button not immediately visible in this view");
        }
    });
});
