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
  const router = useRouter()

  useEffect(() => {
    async function getUser(){
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        router.push('/auth/login')
      }
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

  if (!userId) return <div className="max-w-2xl">Loading...</div>

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
