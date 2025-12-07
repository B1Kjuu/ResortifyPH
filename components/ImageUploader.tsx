'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabaseClient'

type Props = {
  bucket?: string
  onUpload?: (urls: string[]) => void
}

export default function ImageUploader({ bucket = 'resort-images', onUpload }: Props){
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  async function handleUpload(){
    if (!files) return
    setUploading(true)
    const urls: string[] = []
    for (let i = 0; i < files.length; i++){
      const file = files[i]
      const filePath = `${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file)
      if (error){
        console.error(error)
        continue
      }
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      urls.push(publicData.publicUrl)
    }
    setUploading(false)
    setUploadedUrls(urls)
    onUpload?.(urls)
  }

  return (
    <div className="space-y-2">
      <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} />
      <button onClick={handleUpload} className="px-4 py-2 bg-resort-500 text-white rounded" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
      {uploadedUrls.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm text-slate-600">Uploaded images:</div>
          <div className="grid grid-cols-3 gap-2">
            {uploadedUrls.map((url) => (
              <div key={url} className="relative w-full h-24">
                <Image 
                  src={url} 
                  alt="Uploaded" 
                  fill
                  className="object-cover rounded border"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
