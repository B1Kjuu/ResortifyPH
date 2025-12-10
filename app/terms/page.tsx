'use client'
import React from 'react'

export default function TermsPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Hero */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">Terms & Conditions</h1>
          <p className="text-lg text-slate-600">Last updated: December 11, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto prose prose-slate prose-lg">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              By accessing and using ResortifyPH, you accept and agree to be bound by the terms and provisions of this agreement. 
              If you do not agree to these Terms & Conditions, please do not use our service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Use License</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Permission is granted to temporarily access ResortifyPH for personal, non-commercial transitory viewing only. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software</li>
              <li>Remove any copyright or proprietary notations</li>
              <li>Transfer the materials to another person</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Accounts</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you create an account with us, you must provide accurate, complete, and current information. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            </p>
            <p className="text-slate-600 leading-relaxed">
              You are responsible for safeguarding the password that you use to access the service and for any activities 
              or actions under your password.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Booking and Cancellation</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              All bookings made through ResortifyPH are subject to availability and confirmation. Resort owners have the right 
              to accept or decline booking requests. Cancellation policies vary by property and will be clearly stated during booking.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Payment Terms</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Payment processing is handled securely through our platform. All prices are in Philippine Peso (₱) unless otherwise stated. 
              Resort owners are responsible for setting their own pricing and payment terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Content Standards</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Users must not post content that is illegal, harmful, threatening, defamatory, obscene, or otherwise objectionable. 
              ResortifyPH reserves the right to remove any content that violates these standards.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ResortifyPH acts as a platform connecting guests and resort owners. We are not responsible for the quality, safety, 
              or legality of the accommodations listed. Users interact with resort owners at their own risk.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Modifications</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              ResortifyPH reserves the right to revise these terms at any time. By continuing to use the platform after changes 
              are posted, you agree to be bound by the revised terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Contact Information</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms & Conditions, please contact us at support@resortifyph.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
