'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminResortsPage(){
  const [pendingResorts, setPendingResorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAdminAndLoad(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/auth/login'); return }

      // Check if user is admin
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!profile?.is_admin) { router.push('/'); return }

      setIsAdmin(true)

      // Get all pending resorts
      const { data: resorts } = await supabase
        .from('resorts')
        .select('*, owner:profiles(full_name)')
        .eq('status', 'pending')

      setPendingResorts(resorts || [])
      setLoading(false)
    }
    checkAdminAndLoad()
  }, [router])

  async function approveResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    alert('Resort approved!')
  }

  async function rejectResort(id: string){
    const { error } = await supabase
      .from('resorts')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setPendingResorts(pendingResorts.filter(r => r.id !== id))
    alert('Resort rejected.')
  }

  if (loading) return <div className="container py-8">Loading...</div>
  if (!isAdmin) return <div className="container py-8">Unauthorized</div>

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-semibold mb-6">Admin: Resort Approvals</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Pending Resorts ({pendingResorts.length})</h2>
        {pendingResorts.length === 0 ? (
          <p className="text-slate-500">No pending resorts.</p>
        ) : (
          <div className="space-y-4">
            {pendingResorts.map(resort => (
              <div key={resort.id} className="p-6 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-semibold">{resort.name}</h3>
                    <p className="text-sm text-slate-600">Owner: {resort.owner?.full_name || 'Unknown'}</p>
                  </div>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{resort.location} — ₱{resort.price}/night</p>
                <p className="text-sm text-slate-600 mb-2">Capacity: {resort.capacity} guests</p>
                {resort.amenities && <p className="text-sm text-slate-600 mb-2">Amenities: {resort.amenities.join(', ')}</p>}
                <p className="text-sm mb-4">{resort.description}</p>
                <div className="flex gap-2">
                  <button onClick={() => approveResort(resort.id)} className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600">Approve</button>
                  <button onClick={() => rejectResort(resort.id)} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
