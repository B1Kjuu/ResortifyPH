import ChatWindow from '../../../components/ChatWindow'

type Props = {
  params: { bookingId: string }
  searchParams: { as?: 'guest' | 'owner' | 'admin'; title?: string }
}

export default function BookingChatPage({ params, searchParams }: Props) {
  const role = searchParams.as || 'guest'
  const title = searchParams.title || 'Booking Chat'
  return (
    <div className="mx-auto max-w-3xl p-4">
      <ChatWindow bookingId={params.bookingId} participantRole={role} title={title} />
    </div>
  )
}
