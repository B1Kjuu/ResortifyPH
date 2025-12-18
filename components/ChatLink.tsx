import Link from 'next/link'

type Props = {
  bookingId?: string
  resortId?: string
  as: 'guest' | 'owner' | 'admin'
  label?: string
}

export default function ChatLink({ bookingId, resortId, as, label }: Props) {
  const defaultLabel = !label
    ? (as === 'guest' ? 'Message Host' : as === 'owner' ? 'Message Guest' : 'Open Chat')
    : label
  return (
    <Link
      href={resortId ? `/chat/resort/${resortId}?as=${as}` : `/chat/${bookingId}?as=${as}`}
      className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
    >
      {defaultLabel}
    </Link>
  )
}
