"use client"
import Link from 'next/link'

export default function BookingsControlPage(){
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 bg-gradient-to-br from-slate-50 to-white min-h-[80vh]">
      <Link href="/admin/command-center" className="text-sm text-blue-600 font-semibold mb-6 inline-block">← Back to Command Center</Link>
      <div className="max-w-3xl mx-auto bg-white border-2 border-slate-200 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Bookings Access Removed</h1>
        <p className="text-slate-700 mb-4">The admin system is now moderation-first. Viewing or controlling guest bookings has been deprecated to avoid accessing other users’ reservation data.</p>
        <ul className="list-disc pl-5 text-slate-700 space-y-2">
          <li>Use the Moderation Command Center to review user reports.</li>
          <li>Use Approvals to review and approve resort submissions.</li>
          <li>Owners manage bookings; admins no longer confirm/reject bookings.</li>
        </ul>
      </div>
    </div>
  )
}
