'use client'
import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Props = {
  bucket?: string
  onUpload?: (urls: string[]) => void
}

export default function ImageUploader({ bucket = 'resort-images', onUpload }: Props){
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)

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
    onUpload?.(urls)
  }

  return (
    <div className="space-y-2">
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <button onClick={handleUpload} className="px-4 py-2 bg-resortify-500 text-white rounded" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
    </div>
  )
}
