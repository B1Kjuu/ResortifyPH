'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page has been moved to /owner/create-resort
// Redirect users to the correct location
export default function CreateResortRedirect(){
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/owner/create-resort')
  }, [router])
  
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-resort-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to Create Resort...</p>
      </div>
    </div>
  )
}
    e.preventDefault()
    if (!userId) { alert('Not signed in'); return }
    if (!location) { alert('Please pick a province'); return }

    const provinceInfo = getProvinceInfo(location)

    const { error } = await supabase.from('resorts').insert([{ 
      owner_id: userId, 
      name, 
      description, 
      location, 
      region_code: provinceInfo?.regionCode ?? null,
      region_name: provinceInfo?.regionName ?? null,
      price: Number(price), 
      capacity: Number(capacity), 
      amenities: amenities.split(',').map(s => s.trim()), 
      images, 
      status: 'pending', 
      created_at: new Date() 
    }])
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
        <LocationCombobox value={location} onChange={setLocation} placeholder="Search or pick a province" />
        {!location && <p className="text-xs text-slate-500">Guests use this to filter listings, so choose carefully.</p>}
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
