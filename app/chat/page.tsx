import ChatList from '../../components/ChatList'

export default function ChatsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold">My Chats</h1>
      <ChatList />
    </div>
  )
}
