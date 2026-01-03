import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
	throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
	throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Singleton pattern for client-side to avoid creating multiple connections
let supabaseInstance: SupabaseClient | null = null

// Request deduplication cache for concurrent identical requests
const pendingRequests = new Map<string, Promise<any>>()

function getSupabaseClient(): SupabaseClient {
	if (!supabaseInstance) {
		supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				// Detect session from URL for SSO/OAuth flows
				detectSessionInUrl: true,
				// Store session in localStorage for persistence
				storage: typeof window !== 'undefined' ? window.localStorage : undefined,
			},
			// Optimize realtime for fewer connections on free tier
			realtime: {
				params: {
					eventsPerSecond: 5, // Reduced from 10 for free tier
				},
			},
			// Global fetch options for better performance
			global: {
				fetch: (url, options) => {
					return fetch(url, {
						...options,
						// Enable keep-alive for connection reuse
						keepalive: true,
					})
				},
			},
			// Database settings for free tier optimization
			db: {
				schema: 'public',
			},
		})
	}
	return supabaseInstance
}

export const supabase = getSupabaseClient()

/**
 * Execute a query with request deduplication
 * Prevents multiple identical requests from being made simultaneously
 */
export async function deduplicatedQuery<T>(
	key: string,
	queryFn: () => Promise<T>,
	ttl: number = 100 // Short TTL for deduplication
): Promise<T> {
	// Check if there's already a pending request with this key
	const pending = pendingRequests.get(key)
	if (pending) {
		return pending as Promise<T>
	}

	// Create the promise and store it
	const promise = queryFn().finally(() => {
		// Clean up after the request completes
		setTimeout(() => {
			pendingRequests.delete(key)
		}, ttl)
	})

	pendingRequests.set(key, promise)
	return promise
}

/**
 * Optimized select query with caching for read-heavy operations
 */
const queryCache = new Map<string, { data: any; timestamp: number }>()
const QUERY_CACHE_TTL = 30000 // 30 seconds cache

export async function cachedSelect<T>(
	table: string,
	columns: string,
	filters?: Record<string, any>,
	options?: { ttl?: number; forceRefresh?: boolean }
): Promise<T[] | null> {
	const cacheKey = `${table}:${columns}:${JSON.stringify(filters || {})}`
	const ttl = options?.ttl ?? QUERY_CACHE_TTL

	// Check cache unless force refresh
	if (!options?.forceRefresh) {
		const cached = queryCache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < ttl) {
			return cached.data as T[]
		}
	}

	// Execute query
	let query = supabase.from(table).select(columns)
	
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				query = query.eq(key, value)
			}
		})
	}

	const { data, error } = await query

	if (error) {
		console.error(`Query error for ${table}:`, error)
		return null
	}

	// Cache the result
	queryCache.set(cacheKey, { data, timestamp: Date.now() })

	// Clean old cache entries periodically
	if (queryCache.size > 50) {
		const now = Date.now()
		for (const [key, value] of queryCache.entries()) {
			if (now - value.timestamp > ttl * 2) {
				queryCache.delete(key)
			}
		}
	}

	return data as T[]
}

/**
 * Clear query cache for a specific table or all cache
 */
export function clearQueryCache(table?: string): void {
	if (table) {
		for (const key of queryCache.keys()) {
			if (key.startsWith(`${table}:`)) {
				queryCache.delete(key)
			}
		}
	} else {
		queryCache.clear()
	}
}

export default supabase
