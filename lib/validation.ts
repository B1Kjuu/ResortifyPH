// Input validation and sanitization utilities

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' }
  }
  return { valid: true }
}

/**
 * Basic sanitization for user input to prevent XSS attacks
 * WARNING: This provides basic protection for plain text contexts.
 * For HTML content rendering, consider using a more robust library like DOMPurify.
 * Always validate and sanitize user input on both client and server side.
 */
export function sanitizeString(input: string): string {
  // Remove potential XSS characters for plain text contexts
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function validateNumber(value: string | number, min?: number, max?: number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false
  return true
}

export function validateDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

export function validateDateRange(from: string, to: string): { valid: boolean; message?: string } {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { valid: false, message: 'Invalid date format' }
  }

  if (fromDate < now) {
    return { valid: false, message: 'Check-in date cannot be in the past' }
  }

  if (toDate <= fromDate) {
    return { valid: false, message: 'Check-out date must be after check-in date' }
  }

  return { valid: true }
}
