import ChatWindow from '../../../../components/ChatWindow'

type Props = {
  params: { resortId: string }
  searchParams: { as?: 'guest' | 'owner' | 'admin'; title?: string }
}

export default function ResortChatPage({ params, searchParams }: Props) {
  const role = searchParams.as || 'guest'
  const title = searchParams.title || 'Resort Chat'
  return (
    <div className="mx-auto max-w-3xl p-4">
      <ChatWindow resortId={params.resortId} participantRole={role} title={title} />
    </div>
  )
}
