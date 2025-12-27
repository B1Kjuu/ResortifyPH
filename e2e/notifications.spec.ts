import { test, expect } from '@playwright/test'

// These tests dry-run notification endpoints to validate wiring without sending emails.

const toEmail = process.env.NOTIFY_TEST_TO || 'test@example.com'

test.describe('Notifications API (dry run)', () => {
  test('booking-status endpoint responds ok', async ({ request }) => {
    const res = await request.post('/api/notifications/booking-status?dryRun=1', {
      data: {
        to: toEmail,
        status: 'created',
        resortName: 'E2E Test Resort',
        dateFrom: '2025-12-01',
        dateTo: '2025-12-03',
        link: '/chat/TEST-E2E',
      }
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBeTruthy()
    expect(body.dryRun).toBeTruthy()
  })

  test('review-submitted endpoint responds ok', async ({ request }) => {
    const res = await request.post('/api/notifications/review-submitted?dryRun=1', {
      data: {
        to: toEmail,
        resortName: 'E2E Test Resort',
        rating: 5,
        comment: 'Great stay! Dry run.',
        link: '/resorts/TEST-E2E#reviews',
      }
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBeTruthy()
    expect(body.dryRun).toBeTruthy()
  })
})
