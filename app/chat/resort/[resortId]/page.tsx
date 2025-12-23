import ChatWindow from '../../../../components/ChatWindow'

type Props = {
  params: { resortId: string }
  searchParams: { as?: 'guest' | 'owner' | 'admin'; title?: string }
}

export default function ResortChatPage({ params, searchParams }: Props) {
  const role = searchParams.as || 'guest'
  return (
    <div className="mx-auto max-w-3xl p-4">
      {/* Only pass title if provided; otherwise ChatWindow will fetch resort name */}
      <ChatWindow resortId={params.resortId} participantRole={role} title={searchParams.title} />
    </div>
  )
}
