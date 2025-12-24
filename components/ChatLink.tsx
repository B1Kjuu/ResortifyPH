import Link from 'next/link'

type Props = {
  bookingId?: string
  resortId?: string
  as: 'guest' | 'owner' | 'admin'
  label?: string
  title?: string
  variant?: 'outline' | 'primary'
  fullWidth?: boolean
}

export default function ChatLink({ bookingId, resortId, as, label, title, variant = 'outline', fullWidth }: Props) {
  const defaultLabel = !label
    ? (as === 'guest' ? 'Message Host' : as === 'owner' ? 'Message Guest' : 'Open Chat')
    : label
  const qp = new URLSearchParams({ as })
  if (title) qp.set('title', title)
  const base = variant === 'primary'
    ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-resort-500 text-white shadow hover:bg-resort-600 transition-colors'
    : 'inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-50'
  const width = fullWidth ? ' w-full' : ''
  return (
    <Link
      href={resortId ? `/chat/resort/${resortId}?${qp.toString()}` : `/chat/${bookingId}?${qp.toString()}`}
      className={base + width}
    >
      {defaultLabel}
    </Link>
  )
}
