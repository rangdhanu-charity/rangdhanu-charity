import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
    test('homepage has expected title and hero section', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle(/Rangdhanu/i);

        const heroHeading = page.locator('h1').first();
        await expect(heroHeading).toBeVisible();
    });

    test('navigation bar links to key pages', async ({ page }) => {
        await page.goto('/');

        // Target the desktop nav specifically to avoid mobile drawer hidden links
        const desktopNav = page.locator('nav.hidden.md\\:flex');

        // Click on About Us
        await desktopNav.getByRole('link', { name: 'About Us' }).click();
        await expect(page).toHaveURL(/.*about/);
        await expect(page.locator('h1')).toContainText(/About/i);

        // Navigate to Contact
        await desktopNav.getByRole('link', { name: 'Contact' }).click();
        await expect(page).toHaveURL(/.*contact/);
        await expect(page.locator('h1')).toContainText(/Contact/i);
    });
});
