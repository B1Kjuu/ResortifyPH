import { test, expect } from '@playwright/test'

// Basic sanity test for Favorites page in unauthenticated context
// Ensures the route renders and shows sign-in prompt

test('Favorites page prompts sign-in when unauthenticated', async ({ page }) => {
  await page.goto('/guest/favorites')
  const prompt = page.getByTestId('favorites-signin-required')
  await expect(prompt).toBeVisible()
})
