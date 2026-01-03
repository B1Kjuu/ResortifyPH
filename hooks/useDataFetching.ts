'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePaginatedQueryOptions<T> {
  query: () => Promise<{ data: T[]; count: number | null }>
  pageSize?: number
  initialPage?: number
  dependencies?: any[]
}

interface PaginatedResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  page: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  refresh: () => void
}

/**
 * Hook for paginated data fetching with caching
 */
export function usePaginatedQuery<T>({
  query,
  pageSize = 20,
  initialPage = 1,
  dependencies = []
}: UsePaginatedQueryOptions<T>): PaginatedResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const cacheRef = useRef<Map<number, T[]>>(new Map())

  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchData = useCallback(async () => {
    // Check cache first
    if (cacheRef.current.has(page)) {
      setData(cacheRef.current.get(page)!)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await query()
      setData(result.data)
      setTotalCount(result.count || 0)
      cacheRef.current.set(page, result.data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  const refresh = useCallback(() => {
    cacheRef.current.clear()
    fetchData()
  }, [fetchData])

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage(p => p + 1)
  }, [page, totalPages])

  const prevPage = useCallback(() => {
    if (page > 1) setPage(p => p - 1)
  }, [page])

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage)
  }, [totalPages])

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage,
    prevPage,
    goToPage,
    refresh
  }
}

/**
 * Hook for infinite scroll data fetching
 */
export function useInfiniteQuery<T>({
  query,
  pageSize = 20
}: {
  query: (page: number) => Promise<{ data: T[]; hasMore: boolean }>
  pageSize?: number
}) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const loadedRef = useRef(false)

  const fetchInitial = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    
    setLoading(true)
    try {
      const result = await query(1)
      setData(result.data)
      setHasMore(result.hasMore)
      setPage(1)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [query])

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await query(nextPage)
      setData(prev => [...prev, ...result.data])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoadingMore(false)
    }
  }, [query, page, hasMore, loadingMore])

  const refresh = useCallback(async () => {
    loadedRef.current = false
    setData([])
    setPage(1)
    setHasMore(true)
    await fetchInitial()
  }, [fetchInitial])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    fetchMore,
    refresh
  }
}

/**
 * Hook for debounced search
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)
    return () => clearTimeout(timer)
  }, [query, delay])

  // Fetch when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)
    
    searchFn(debouncedQuery)
      .then(data => {
        if (!cancelled) {
          setResults(data)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, searchFn])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clear: () => {
      setQuery('')
      setResults([])
    }
  }
}

/**
 * Hook for real-time data with optimistic updates
 */
export function useOptimisticUpdate<T extends { id: string }>(
  initialData: T[],
  updateFn: (item: T) => Promise<T>
) {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const update = useCallback(async (item: T) => {
    // Optimistic update
    setPendingUpdates(prev => new Set(prev).add(item.id))
    setData(prev => prev.map(d => d.id === item.id ? item : d))

    try {
      const result = await updateFn(item)
      setData(prev => prev.map(d => d.id === result.id ? result : d))
    } catch (err) {
      // Rollback on error
      setData(initialData)
      throw err
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }, [initialData, updateFn])

  return {
    data,
    update,
    isPending: (id: string) => pendingUpdates.has(id)
  }
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current()
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [options])

  return ref
}
