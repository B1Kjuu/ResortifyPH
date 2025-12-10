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
  }, [])

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
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/owner/empire" className="text-sm text-resort-500 font-semibold mb-8 inline-flex items-center gap-2 hover:gap-3 transition-all">← Back to Empire</Link>
        
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">🏗️</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Launch Your Resort</h1>
          </div>
          <p className="text-lg text-slate-600 ml-20">Submit your property for approval. Fill in all details carefully to increase approval chances.</p>
        </div>

        <form onSubmit={handleCreate} className="bg-white border-2 border-slate-200 rounded-3xl shadow-lg p-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <span>🏨</span>
              <span>Resort Name *</span>
            </label>
            <input 
              type="text"
              className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors" 
              placeholder="e.g., Paradise Beach Resort" 
              value={name} 
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <span>📍</span>
              <span>Location *</span>
            </label>
            <select
              className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-white shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            >
              <option value="">Select province...</option>
              <option value="Metro Manila">Metro Manila</option>
              <option value="Cavite">Cavite</option>
              <option value="Laguna">Laguna</option>
              <option value="Batangas">Batangas</option>
              <option value="Cebu">Cebu</option>
              <option value="Iloilo">Iloilo</option>
              <option value="Davao">Davao</option>
              <option value="Cagayan de Oro">Cagayan de Oro</option>
              <option value="Palawan">Palawan</option>
              <option value="Boracay">Boracay</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <span>💰</span>
                <span>Price per Night (₱) *</span>
              </label>
              <input 
                type="number"
                className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors" 
                placeholder="0" 
                value={price as any} 
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <span>👥</span>
                <span>Guest Capacity *</span>
              </label>
              <input 
                type="number"
                className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors" 
                placeholder="0" 
                value={capacity as any} 
                onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <span>✨</span>
              <span>Amenities (comma separated)</span>
            </label>
            <input 
              type="text"
              className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors" 
              placeholder="Pool, WiFi, Air Conditioning, Restaurant" 
              value={amenities} 
              onChange={e => setAmenities(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <span>📝</span>
              <span>Description</span>
            </label>
            <textarea 
              className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors resize-none" 
              placeholder="Describe your resort, amenities, and what makes it special" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <span>📸</span>
              <span>Resort Images</span>
            </label>
            <ImageUploader onUpload={(urls) => setImages(urls)} />
            {images.length > 0 && <p className="text-xs text-slate-600 mt-2 font-semibold">✅ {images.length} image(s) uploaded</p>}
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-resort-400"
            >
              {submitting ? '⏳ Launching...' : '🚀 Launch Resort'}
            </button>
            <Link href="/owner/empire" className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-center hover:bg-slate-50 hover:border-slate-400 transition-all">
              ✕ Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
