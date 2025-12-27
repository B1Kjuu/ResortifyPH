import { test, expect } from '@playwright/test'

const catalogHeading = /Explore Resorts/i

test.describe('Resorts catalog', () => {
  test('renders filter controls and empty state', async ({ page }) => {
    await page.goto('/resorts')

    await expect(page.getByRole('heading', { name: catalogHeading })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Search resorts' })).toBeVisible()
    await expect(page.getByLabel('Filter by resort type')).toBeVisible()
    await expect(page.getByLabel('Filter by guest count')).toBeVisible()
    await expect(page.getByLabel('Filter by location')).toBeVisible()
    await expect(page.getByRole('button', { name: /Clear All/i })).toBeVisible()
    await expect(page.getByTestId('results-count')).toBeVisible()
  })

  test('pushes filter changes into the URL query string', async ({ page }) => {
    await page.goto('/resorts')

    const typeFilter = page.getByLabel('Filter by resort type')
    await typeFilter.selectOption('beach')
    await expect(page).toHaveURL(/type=beach/i, { timeout: 15_000 })

    const poolAmenity = page.getByRole('button', { name: 'Pool' })
    await poolAmenity.click()
    await expect(page).toHaveURL(/amenities=Pool/, { timeout: 15_000 })

    await page.getByRole('button', { name: /Clear All/i }).click()
    await expect(page).toHaveURL(/\/resorts$/, { timeout: 15_000 })
  })
})
