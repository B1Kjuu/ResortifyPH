/**
 * Performance utilities for optimizing API calls and data fetching
 * Optimized for Vercel Free Tier + Supabase Free Tier
 */

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds default

// Pending request deduplication map
const pendingRequests = new Map<string, Promise<any>>()

/**
 * Fetch with caching and request deduplication
 * Prevents multiple identical requests and caches responses
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cacheKey = `${url}${JSON.stringify(options?.body || '')}`
  
  // Check cache first
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }
  
  // Check if there's already a pending request for this URL
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    return pending as Promise<T>
  }
  
  // Create the fetch promise
  const fetchPromise = (async () => {
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
  })().finally(() => {
    // Remove from pending after completion
    pendingRequests.delete(cacheKey)
  })
  
  pendingRequests.set(cacheKey, fetchPromise)
  return fetchPromise
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

/**
 * Get optimized image URL with quality and size parameters
 * Optimized for Vercel Image Optimization
 */
export function getOptimizedImageUrl(
  src: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  const { width = 800, quality = 75 } = options
  
  // If it's already a Next.js optimized URL, return as-is
  if (src.startsWith('/_next/image')) {
    return src
  }
  
  // For Supabase storage images, add transformation parameters
  if (src.includes('supabase.co/storage')) {
    // Supabase storage supports image transformations
    const url = new URL(src)
    url.searchParams.set('width', width.toString())
    url.searchParams.set('quality', quality.toString())
    return url.toString()
  }
  
  return src
}

/**
 * Preload critical resources
 */
export function preloadResources(urls: string[]): void {
  if (typeof document === 'undefined') return
  
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    
    if (url.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i)) {
      link.as = 'image'
    } else if (url.match(/\.css$/i)) {
      link.as = 'style'
    } else if (url.match(/\.js$/i)) {
      link.as = 'script'
    } else if (url.match(/\.(woff|woff2|ttf|otf)$/i)) {
      link.as = 'font'
      link.crossOrigin = 'anonymous'
    }
    
    link.href = url
    document.head.appendChild(link)
  })
}

/**
 * Intersection Observer wrapper for lazy loading
 */
export function createLazyLoader(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry)
      }
    })
  }, {
    rootMargin: '100px',
    threshold: 0.1,
    ...options
  })
}

/**
 * Memory-efficient pagination helper
 * Useful for virtual scrolling with limited memory
 */
export function createVirtualWindow<T>(
  items: T[],
  windowSize: number = 20
): {
  getWindow: (startIndex: number) => T[]
  totalItems: number
} {
  return {
    getWindow: (startIndex: number) => {
      const start = Math.max(0, startIndex)
      const end = Math.min(items.length, start + windowSize)
      return items.slice(start, end)
    },
    totalItems: items.length
  }
}

/**
 * Connection quality detection for adaptive loading
 */
export function getConnectionQuality(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined') return 'medium'
  
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection
  
  if (!connection) return 'medium'
  
  const effectiveType = connection.effectiveType
  
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow'
  } else if (effectiveType === '3g') {
    return 'medium'
  }
  
  return 'fast'
}

/**
 * Reduce image quality based on connection
 */
export function getAdaptiveImageQuality(): number {
  const quality = getConnectionQuality()
  
  switch (quality) {
    case 'slow': return 50
    case 'medium': return 70
    case 'fast': return 85
    default: return 75
  }
}
