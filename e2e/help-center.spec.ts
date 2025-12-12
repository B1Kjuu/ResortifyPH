import { test, expect } from '@playwright/test'

test.describe('Help Center', () => {
  test('renders FAQs and quick links', async ({ page }) => {
    await page.goto('/help-center')

    await expect(page.getByRole('heading', { level: 1, name: 'Help Center' })).toBeVisible()
    await expect(page.getByPlaceholder('Search for help...')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contact Us' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Getting Started/i })).toBeVisible()
  })
})
