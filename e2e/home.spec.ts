import { test, expect } from '@playwright/test'

const heroHeading = /find your next/i

test.describe('Landing experience', () => {
  test('shows hero content to visitors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const heroBrowseCta = page
      .getByRole('main')
      .getByRole('link', { name: 'Browse Resorts', exact: true })

    await expect(page.getByRole('heading', { name: heroHeading })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Discover Your Perfect Escape')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started Free' })).toBeVisible()
    await expect(heroBrowseCta).toBeVisible()
  })

  test('navigates to resorts catalog', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const heroBrowseCta = page
      .getByRole('main')
      .getByRole('link', { name: 'Browse Resorts', exact: true })

    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      heroBrowseCta.dispatchEvent('click'),
    ])
    await expect(page).toHaveURL(/\/resorts/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /Explore Resorts/i })).toBeVisible({ timeout: 15_000 })
  })
})
