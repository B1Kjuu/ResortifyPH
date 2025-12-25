import DisclaimerBanner from '../../../components/DisclaimerBanner'
import ChatWindow from '../../../components/ChatWindow'

type Props = {
  params: { bookingId: string }
  searchParams: { as?: 'guest' | 'owner' | 'admin'; title?: string }
}

export default function BookingChatPage({ params, searchParams }: Props) {
  const role = searchParams.as || 'guest'
  // Let ChatWindow fetch dynamic title based on booking/resort
  return (
    <div className="mx-auto max-w-3xl p-4 space-y-3">
      <DisclaimerBanner />
      <ChatWindow bookingId={params.bookingId} participantRole={role} title={searchParams.title} />
    </div>
  )
}
