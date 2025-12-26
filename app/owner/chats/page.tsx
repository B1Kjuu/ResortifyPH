import ChatList from '../../../components/ChatList'
import DisclaimerBanner from '../../../components/DisclaimerBanner'

export default function OwnerChatsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold">My Chats (Host)</h1>
      <div className="mb-4">
        <DisclaimerBanner title="Owner Payment Notice">
          ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
        </DisclaimerBanner>
      </div>
      <ChatList roleFilter="owner" />
    </div>
  )
}
