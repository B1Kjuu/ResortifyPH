import { test, expect } from '@playwright/test'

const toEmail = process.env.NOTIFY_TEST_TO || 'test@example.com'

// This test dry-runs the admin notification for resort submission.

test('resort-submitted endpoint responds ok (dry run)', async ({ request }) => {
  const res = await request.post('/api/notifications/resort-submitted?dryRun=1', {
    data: {
      resortName: 'Playwright Resort',
      ownerEmail: toEmail,
      ownerId: 'TEST-OWNER',
      location: 'Metro Manila',
      price: 5000,
    }
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.ok).toBeTruthy()
  expect(body.dryRun).toBeTruthy()
})
