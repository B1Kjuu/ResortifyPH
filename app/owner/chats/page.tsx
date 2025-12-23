import ChatList from '../../../components/ChatList'

export default function OwnerChatsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold">My Chats (Host)</h1>
      <ChatList roleFilter="owner" />
    </div>
  )
}
