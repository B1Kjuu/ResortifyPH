import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'

export type RateLimitScope = 'api:write' | 'api:read'

export type RateLimitResult = {
  ok: boolean
  limit?: number
  remaining?: number
  reset?: number
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  return new Redis({ url, token })
}

let ratelimitWrite: Ratelimit | null = null
let ratelimitRead: Ratelimit | null = null

function getLimiters() {
  if (ratelimitWrite && ratelimitRead) return { ratelimitWrite, ratelimitRead }

  const redis = getRedis()
  if (!redis) return { ratelimitWrite: null, ratelimitRead: null }

  // Tune these based on your plan and traffic patterns.
  // Writes are more sensitive; reads can be higher.
  ratelimitWrite = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'resortify:rl:write',
  })

  ratelimitRead = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    analytics: true,
    prefix: 'resortify:rl:read',
  })

  return { ratelimitWrite, ratelimitRead }
}

export async function rateLimit(input: {
  scope: RateLimitScope
  key: string
}): Promise<RateLimitResult> {
  const { ratelimitWrite, ratelimitRead } = getLimiters()
  const limiter = input.scope === 'api:write' ? ratelimitWrite : ratelimitRead

  // No Upstash configured: caller should use a fallback limiter.
  if (!limiter) return { ok: true }

  const result = await limiter.limit(input.key)
  return {
    ok: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}
