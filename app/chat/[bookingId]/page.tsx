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
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col p-3 sm:p-4 lg:p-6">
        <div className="mb-3">
          <DisclaimerBanner />
        </div>
        <div className="flex-1 min-h-0">
          <ChatWindow bookingId={params.bookingId} participantRole={role} title={searchParams.title} />
        </div>
      </div>
    </div>
  )
}
