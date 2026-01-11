import type { SupabaseClient } from '@supabase/supabase-js'

export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		String(value || '')
	)
}

export function slugify(value: string): string {
	const input = String(value || '').trim().toLowerCase()
	if (!input) return ''

	// Basic ASCII slugification (keeps it dependency-free)
	return input
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-+|-+$)/g, '')
}

function randomSuffix(length: number): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let out = ''

	// Prefer crypto when available (browser + modern runtimes)
	const cryptoObj: Crypto | undefined = (globalThis as any).crypto
	if (cryptoObj?.getRandomValues) {
		const buf = new Uint8Array(length)
		cryptoObj.getRandomValues(buf)
		for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length]
		return out
	}

	for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
	return out
}

export async function generateUniqueResortSlug(
	name: string,
	supabase: SupabaseClient,
	options?: { maxAttempts?: number }
): Promise<string> {
	const base = slugify(name) || 'resort'
	const maxAttempts = options?.maxAttempts ?? 6

	// Try base first
	{
		const { data, error } = await supabase
			.from('resorts')
			.select('id')
			.eq('slug', base)
			.limit(1)
			.maybeSingle()
		if (!error && !data) return base
	}

	// Then try base-xxxx suffixes
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const candidate = `${base}-${randomSuffix(4)}`
		const { data, error } = await supabase
			.from('resorts')
			.select('id')
			.eq('slug', candidate)
			.limit(1)
			.maybeSingle()
		if (!error && !data) return candidate
	}

	// Extremely unlikely fallback
	return `${base}-${Date.now().toString(36)}`
}
