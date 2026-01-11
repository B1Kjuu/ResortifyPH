'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUploader from '../../../components/ImageUploader'
import LocationCombobox from '../../../components/LocationCombobox'
import DisclaimerBanner from '../../../components/DisclaimerBanner'
import { getProvinceInfo } from '../../../lib/locations'
import { supabase } from '../../../lib/supabaseClient'
import { generateUniqueResortSlug } from '../../../lib/slug'
import { useRouter } from 'next/navigation'
import { FiMapPin, FiDollarSign, FiUsers, FiStar, FiEdit3, FiCamera, FiCheck, FiClock, FiX } from 'react-icons/fi'
import { FaHotel, FaRocket } from 'react-icons/fa'
import { RESORT_TYPES } from '../../../lib/resortTypes'

export default function LaunchResort(){
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<'beach' | 'mountain' | 'nature' | 'city' | 'countryside' | 'staycation' | 'private' | 'villa' | 'glamping' | 'farmstay' | 'spa'>('city')
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_admin')
        .eq('id', session.user.id)
        .single()
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
    const provinceInfo = getProvinceInfo(location)

    const slug = await generateUniqueResortSlug(name, supabase)

    const { error } = await supabase.from('resorts').insert([{ 
      owner_id: userId, 
      name, 
      slug,
      description, 
      location, 
      region_code: provinceInfo?.regionCode ?? null,
      region_name: provinceInfo?.regionName ?? null,
      type,
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
            <FaRocket className="w-12 h-12 text-resort-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-resort-600 to-blue-600 bg-clip-text text-transparent">Launch Your Resort</h1>
          </div>
          <p className="text-lg text-slate-600 ml-20">Submit your property for approval. Fill in all details carefully to increase approval chances.</p>
          <div className="mt-4 ml-20">
            <DisclaimerBanner title="Owner Payment Notice">
              ResortifyPH does not process payments. Please share payment details with guests in chat and verify incoming transfers before confirming stays.
            </DisclaimerBanner>
          </div>
        </div>

        <form onSubmit={handleCreate} className="bg-white border-2 border-slate-200 rounded-3xl shadow-lg p-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <FaHotel className="w-4 h-4" />
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
              <FiMapPin className="w-4 h-4" />
              <span>Location *</span>
            </label>
            <LocationCombobox
              value={location}
              onChange={setLocation}
              placeholder="Search or pick a province"
            />
            {!location && <p className="text-xs text-slate-500 mt-1">Choose the exact province where your resort is located.</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <FiMapPin className="w-4 h-4" />
                <span>Resort Type *</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 bg-slate-50 hover:border-slate-300 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                required
              >
                {RESORT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <FiDollarSign className="w-4 h-4" />
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
                <FiUsers className="w-4 h-4" />
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
              <FiStar className="w-4 h-4" />
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
              <FiEdit3 className="w-4 h-4" />
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
              <FiCamera className="w-4 h-4" />
              <span>Resort Images</span>
            </label>
            <ImageUploader onUpload={(urls) => setImages(urls)} />
            {images.length > 0 && <p className="text-xs text-slate-600 mt-2 font-semibold inline-flex items-center gap-1"><FiCheck className="w-4 h-4 text-green-600" /> {images.length} image(s) uploaded</p>}
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-resort-400"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2"><FiClock className="w-4 h-4" /> Launching...</span>
              ) : (
                <span className="inline-flex items-center gap-2"><FaRocket className="w-4 h-4" /> Launch Resort</span>
              )}
            </button>
            <Link href="/owner/empire" className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-center hover:bg-slate-50 hover:border-slate-400 transition-all">
              <span className="inline-flex items-center gap-2 justify-center"><FiX className="w-4 h-4" /> Cancel</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
