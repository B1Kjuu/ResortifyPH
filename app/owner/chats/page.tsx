import ChatList from '../../../components/ChatList'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { FiMessageSquare } from 'react-icons/fi'

export default function OwnerChatsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-resort-100 rounded-xl">
              <FiMessageSquare className="w-6 h-6 text-resort-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Guest Messages</h1>
              <p className="text-sm text-slate-500">Manage conversations with your guests</p>
            </div>
          </div>
        </div>

        {/* Payment Notice */}
        <div className="mb-4">
          <DisclaimerBanner title="Payment Reminder">
            Share your payment details with guests in chat and verify transfers before confirming bookings.
          </DisclaimerBanner>
        </div>
        
        {/* Chat List Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <ChatList roleFilter="owner" />
        </div>
      </div>
    </div>
  )
}
