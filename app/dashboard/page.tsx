'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// Redirect from generic dashboard to role-specific dashboard
export default function Dashboard(){
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { 
        router.replace('/auth/login')
        return 
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', session.user.id)
        .single()
      
      if (!profile) {
        router.replace('/auth/login')
        return
      }

      // Redirect to appropriate dashboard based on role
      if (profile.is_admin) {
        router.replace('/admin/command-center')
      } else if (profile.role === 'owner') {
        router.replace('/owner/empire')
      } else {
        router.replace('/guest/adventure-hub')
      }
    }
    load()
  }, [router])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">
      <p>Redirecting to your dashboard...</p>
    </div>
  )
}
