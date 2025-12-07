'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUploader from '../../../components/ImageUploader'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LaunchResort(){
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
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getUser(){
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        setLoading(false)
        return
      }

      // Check if user is owner
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'owner') {
        router.push('/owner/empire')
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
    if (!userId || !name || !location || !price || !capacity) { alert('Please fill all required fields'); return }
    
    setSubmitting(true)
    const { error } = await supabase.from('resorts').insert([{ 
      owner_id: userId, 
      name, 
      description, 
      location, 
      price: Number(price), 
      capacity: Number(capacity), 
      amenities: amenities.split(',').map(s => s.trim()).filter(s => s), 
      images, 
      status: 'pending', 
      created_at: new Date() 
    }])
    
    if (error) { 
      alert('Error: ' + error.message)
      setSubmitting(false)
      return 
    }
    
    alert('Resort launched and pending approval!')
    router.push('/owner/properties')
  }

  if (loading) return <div className="w-full px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-600">Loading...</div>
  if (!isAuthorized) return null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-2xl mx-auto">
      <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-4 inline-block">← Back to Empire</Link>
      
      <h1 className="text-3xl font-bold text-resort-900 mb-2">Launch Your Resort</h1>
      <p className="text-slate-600 mb-8">Submit your property for approval. Fill in all details carefully to increase approval chances.</p>

      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Resort Name *</label>
          <input 
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500" 
            placeholder="e.g., Paradise Beach Resort" 
            value={name} 
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Location *</label>
          <select 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500"
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
          >
            <option value="">Select location...</option>
            <option value="Manila">Manila</option>
            <option value="Antipolo">Antipolo</option>
            <option value="Rizal">Rizal</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Price per Night (₱) *</label>
            <input 
              type="number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500" 
              placeholder="0" 
              value={price as any} 
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Guest Capacity *</label>
            <input 
              type="number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500" 
              placeholder="0" 
              value={capacity as any} 
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Amenities (comma separated)</label>
          <input 
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500" 
            placeholder="Pool, WiFi, Air Conditioning, Restaurant" 
            value={amenities} 
            onChange={e => setAmenities(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-resort-500 resize-none" 
            placeholder="Describe your resort, amenities, and what makes it special" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Resort Images</label>
          <ImageUploader onUpload={(urls) => setImages(urls)} />
          {images.length > 0 && <p className="text-xs text-slate-500 mt-2">✓ {images.length} image(s) uploaded</p>}
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-resort-500 text-white rounded-lg font-semibold hover:bg-resort-600 transition disabled:opacity-50"
          >
            {submitting ? 'Launching...' : 'Launch Resort'}
          </button>
          <Link href="/owner/empire" className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-semibold text-center hover:bg-slate-50 transition">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
