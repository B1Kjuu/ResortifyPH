import { test, expect } from '@playwright/test'

const heroHeading = /find your next/i

test.describe('Global navigation', () => {
  test('header Explore link opens the resorts catalog', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: heroHeading })).toBeVisible({ timeout: 15_000 })

    const primaryNav = page.getByRole('navigation')

    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      primaryNav.locator('a[href="/resorts"]').first().dispatchEvent('click'),
    ])

    await page.waitForURL(/\/resorts/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/resorts/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /Explore Resorts/i })).toBeVisible({ timeout: 15_000 })
  })

  test('footer Help Center link guides users to support content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: heroHeading })).toBeVisible({ timeout: 15_000 })

    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('heading', { name: /For Guests/i })).toBeVisible()
    await expect(footer.getByRole('heading', { name: /Company/i })).toBeVisible()

    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      footer.locator('a[href="/help-center"]').first().click({ force: true }),
    ])

    await expect(page).toHaveURL(/\/help-center/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Help Center' })).toBeVisible({ timeout: 15_000 })
  })
})
