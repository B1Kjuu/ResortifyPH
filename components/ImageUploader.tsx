'use client'
import React, { useState, useRef, useId } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FiFolder, FiUpload, FiLoader, FiInfo, FiCheck } from 'react-icons/fi'

type Props = {
  bucket?: string
  onUpload?: (urls: string[]) => void
}

export default function ImageUploader({ bucket = 'resort-images', onUpload }: Props){
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

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
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)} 
          className="hidden"
          id={`image-input-${inputId}`}
        />
        <label 
          htmlFor={`image-input-${inputId}`}
          className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-700 hover:border-resort-400 hover:bg-resort-50 transition-all cursor-pointer bg-white shadow-sm"
        >
          <FiFolder className="w-5 h-5" />
          <span>Choose Files</span>
        </label>
        
        {files && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-600 font-semibold text-sm">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}
        
        <button 
          onClick={handleUpload} 
          disabled={uploading || !files}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-resort-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {uploading ? (
            <>
              <FiLoader className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <FiUpload className="w-5 h-5" />
              <span>Upload Images</span>
            </>
          )}
        </button>
      </div>
      
      <div className="text-xs text-slate-500">
        <p className="flex items-center gap-1"><FiInfo className="w-4 h-4" /> <strong>Tip:</strong> Upload high-quality photos showing pool, rooms, amenities, and outdoor areas. Maximum 10 images recommended.</p>
      </div>
      
      {uploadedUrls.length > 0 && (
        <div className="space-y-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <FiCheck className="text-green-600 w-5 h-5" />
            <div className="text-sm font-semibold text-green-800">
              Successfully uploaded {uploadedUrls.length} image{uploadedUrls.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {uploadedUrls.map((url, index) => (
              <div key={url} className="relative group">
                <img 
                  src={url} 
                  alt={`Uploaded ${index + 1}`} 
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-300 shadow-sm group-hover:shadow-md transition-shadow" 
                />
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
