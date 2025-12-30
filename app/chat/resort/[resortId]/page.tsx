import ChatWindow from '../../../../components/ChatWindow'
import DisclaimerBanner from '../../../../components/DisclaimerBanner'

type Props = {
  params: { resortId: string }
  searchParams: { as?: 'guest' | 'owner' | 'admin'; title?: string }
}

export default function ResortChatPage({ params, searchParams }: Props) {
  const role = searchParams.as || 'guest'
  return (
    <div className="h-[calc(100dvh-64px)] sm:h-[calc(100dvh-80px)] flex flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col p-2 sm:p-4 lg:p-6 min-h-0 overflow-hidden">
        <div className="hidden sm:block mb-2 sm:mb-3 shrink-0">
          <DisclaimerBanner />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Only pass title if provided; otherwise ChatWindow will fetch resort name */}
          <ChatWindow resortId={params.resortId} participantRole={role} title={searchParams.title} />
        </div>
      </div>
    </div>
  )
}
