/**
 * Performance utilities for optimizing API calls and data fetching
 */

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds default

/**
 * Fetch with caching - caches responses in memory
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cacheKey = `${url}${JSON.stringify(options?.body || '')}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }
  
  const response = await fetch(url, options)
  const data = await response.json()
  
  cache.set(cacheKey, { data, timestamp: Date.now() })
  
  // Clean old cache entries periodically
  if (cache.size > 100) {
    const now = Date.now()
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl * 2) {
        cache.delete(key)
      }
    }
  }
  
  return data as T
}

/**
 * Clear specific cache entry or all cache
 */
export function clearCache(url?: string): void {
  if (url) {
    for (const key of cache.keys()) {
      if (key.startsWith(url)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

/**
 * Debounce function - limits how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Throttle function - ensures function is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Batch multiple requests into one - useful for fetching multiple items
 */
export function createBatcher<K, V>(
  fetchBatch: (keys: K[]) => Promise<Map<K, V>>,
  delay: number = 50
): (key: K) => Promise<V | undefined> {
  let batch: K[] = []
  let batchPromise: Promise<Map<K, V>> | null = null
  let timeoutId: NodeJS.Timeout | null = null
  
  return async (key: K): Promise<V | undefined> => {
    batch.push(key)
    
    if (!batchPromise) {
      batchPromise = new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          const keys = [...batch]
          batch = []
          batchPromise = null
          timeoutId = null
          
          const results = await fetchBatch(keys)
          resolve(results)
        }, delay)
      })
    }
    
    const results = await batchPromise
    return results.get(key)
  }
}

/**
 * Retry failed requests with exponential backoff
 */
export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

/**
 * Lazy load heavy components
 */
export function lazyLoad<T>(
  loader: () => Promise<T>
): { load: () => Promise<T>; loaded: boolean } {
  let cache: T | null = null
  let loading: Promise<T> | null = null
  
  return {
    get loaded() {
      return cache !== null
    },
    async load() {
      if (cache) return cache
      if (loading) return loading
      
      loading = loader()
      cache = await loading
      loading = null
      return cache
    },
  }
}
