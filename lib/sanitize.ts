export function sanitizeText(input: string | null | undefined, maxLen = 2000): string {
  if (!input) return ''
  // Strip HTML tags, trim whitespace, collapse consecutive spaces
  const stripped = input.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  const collapsed = stripped.replace(/\s+/g, ' ')
  return collapsed.slice(0, maxLen)
}
