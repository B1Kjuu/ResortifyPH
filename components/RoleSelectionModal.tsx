'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { FiHome, FiCalendar, FiArrowRight } from 'react-icons/fi'
import { FaUmbrellaBeach } from 'react-icons/fa'

interface RoleSelectionModalProps {
  userId: string
  onComplete: () => void
}

export default function RoleSelectionModal({ userId, onComplete }: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'guest' | 'owner' | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleContinue() {
    if (!selectedRole) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: selectedRole,
          initial_role_selected: true 
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to save role:', error)
        alert('Failed to save your selection. Please try again.')
        setLoading(false)
        return
      }

      onComplete()

      // Redirect based on role
      if (selectedRole === 'owner') {
        router.push('/owner/empire')
      } else {
        router.push('/resorts')
      }
    } catch (err) {
      console.error('Role selection error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-resort-500 to-blue-500 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUmbrellaBeach className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to ResortifyPH!</h2>
          <p className="text-white/90 text-sm">Let's personalize your experience. How will you be using ResortifyPH?</p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Guest Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('guest')}
            className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'guest'
                ? 'border-resort-500 bg-resort-50 ring-2 ring-resort-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRole === 'guest' ? 'bg-resort-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <FiCalendar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-1">I want to book resorts</h3>
                <p className="text-sm text-slate-600">
                  Explore and book amazing private resorts, beach houses, and vacation spots across the Philippines.
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                selectedRole === 'guest' ? 'border-resort-500 bg-resort-500' : 'border-slate-300'
              }`}>
                {selectedRole === 'guest' && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Owner Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('owner')}
            className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'owner'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedRole === 'owner' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <FiHome className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-1">I want to list my resort</h3>
                <p className="text-sm text-slate-600">
                  List your resort property and start accepting bookings from guests looking for their next getaway.
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                selectedRole === 'owner' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {selectedRole === 'owner' && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Info note */}
          <p className="text-xs text-slate-500 text-center px-4">
            Don't worry — you can switch roles or access both features anytime from your profile settings.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
              selectedRole
                ? 'bg-gradient-to-r from-resort-500 to-blue-500 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Setting up...
              </>
            ) : (
              <>
                Continue
                <FiArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
