import { Metadata } from 'next'
import PaymentTemplateManager from '@/components/PaymentTemplateManager'
import { FiCreditCard, FiInfo } from 'react-icons/fi'

export const metadata: Metadata = {
  title: 'Payment Settings | ResortifyPH',
  description: 'Manage your payment templates and details',
}

export default function PaymentSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <FiCreditCard className="w-6 h-6 text-cyan-600" />
          Payment Settings
        </h1>
        <p className="text-slate-600 mt-1">
          Set up your payment templates to quickly share payment details with guests
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex gap-3">
          <FiInfo className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">How it works</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Create templates with your payment details (GCash, Bank, Maya)</li>
              <li>Set a default template for quick access</li>
              <li>Click the 💳 button in chat to send payment details instantly</li>
              <li>Guests can submit payment proof directly in chat</li>
              <li>Verify payments and the booking status updates automatically</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Payment Templates</h2>
        <PaymentTemplateManager />
      </div>
    </div>
  )
}
