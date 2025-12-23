import Link from 'next/link'

type Props = {
  bookingId?: string
  resortId?: string
  as: 'guest' | 'owner' | 'admin'
  label?: string
  title?: string
}

export default function ChatLink({ bookingId, resortId, as, label, title }: Props) {
  const defaultLabel = !label
    ? (as === 'guest' ? 'Message Host' : as === 'owner' ? 'Message Guest' : 'Open Chat')
    : label
  const qp = new URLSearchParams({ as })
  if (title) qp.set('title', title)
  return (
    <Link
      href={resortId ? `/chat/resort/${resortId}?${qp.toString()}` : `/chat/${bookingId}?${qp.toString()}`}
      className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
    >
      {defaultLabel}
    </Link>
  )
}
