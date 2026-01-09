// Utility functions

/**
 * Masks a name for privacy while keeping first and last characters visible
 * Examples:
 * - "Joebeck Gusi" → "J*****k G**i"
 * - "John" → "J**n"
 * - "A" → "A"
 */
export function maskName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return 'Guest'
  
  const trimmed = name.trim()
  
  // If name has spaces, process each part separately
  if (trimmed.includes(' ')) {
    return trimmed
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => maskSingleName(part))
      .join(' ')
  }
  
  return maskSingleName(trimmed)
}

function maskSingleName(name: string): string {
  if (name.length === 1) return name
  if (name.length === 2) return `${name[0]}*`
  if (name.length === 3) return `${name[0]}*${name[2]}`
  
  const firstChar = name[0]
  const lastChar = name[name.length - 1]
  const middleLength = name.length - 2
  const stars = '*'.repeat(middleLength)
  
  return `${firstChar}${stars}${lastChar}`
}
