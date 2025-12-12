'use client'
import React, { useState, useEffect } from 'react'
import ImageUploader from '../../../components/ImageUploader'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function CreateResort(){
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [capacity, setCapacity] = useState<number | ''>('')
  const [amenities, setAmenities] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getUser(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/login')
        setLoading(false)
        return
      }

      // Check if user is owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
      if (profile?.role !== 'owner') {
        router.push('/dashboard')
        setLoading(false)
        return
      }

      setUserId(session.user.id)
      setIsAuthorized(true)
      setLoading(false)
    }
    getUser()
  }, [router])

  async function handleCreate(e: React.FormEvent){
    e.preventDefault()
    if (!userId) { alert('Not signed in'); return }
    const { error } = await supabase.from('resorts').insert([{ owner_id: userId, name, description, location, price: Number(price), capacity: Number(capacity), amenities: amenities.split(',').map(s => s.trim()), images, status: 'pending', created_at: new Date() }])
    if (error) { alert(error.message); return }
    alert('Resort created and pending approval')
    router.push('/dashboard/resorts')
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>
  if (!isAuthorized) return null

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4">Create Resort</h2>
      <form onSubmit={handleCreate} className="space-y-3">
        <input className="w-full p-2 border rounded" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Price" value={price as any} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
        <input className="w-full p-2 border rounded" placeholder="Capacity" value={capacity as any} onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} />
        <input className="w-full p-2 border rounded" placeholder="Amenities (comma separated)" value={amenities} onChange={e => setAmenities(e.target.value)} />
        <textarea className="w-full p-2 border rounded" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

        <div>
          <ImageUploader onUpload={(urls) => setImages(urls)} />
          <div className="text-sm text-slate-500 mt-2">Uploaded {images.length} images</div>
        </div>

        <button className="px-4 py-2 bg-resort-500 text-white rounded">Create</button>
      </form>
    </div>
  )
}
