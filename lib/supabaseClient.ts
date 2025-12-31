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

function getSupabaseClient(): SupabaseClient {
	if (!supabaseInstance) {
		supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
			},
			// Optimize realtime for fewer connections
			realtime: {
				params: {
					eventsPerSecond: 10,
				},
			},
			// Global fetch options for better caching
			global: {
				fetch: (url, options) => {
					return fetch(url, {
						...options,
						// Enable keep-alive for connection reuse
						keepalive: true,
					})
				},
			},
		})
	}
	return supabaseInstance
}

export const supabase = getSupabaseClient()

export default supabase
