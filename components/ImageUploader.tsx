'use client'
import React, { useState, useRef, useId } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FiFolder, FiLoader, FiInfo, FiCheck, FiX } from 'react-icons/fi'
import { toast } from 'sonner'

type Props = {
  bucket?: string
  onUpload?: (urls: string[]) => void
  existingUrls?: string[]
  onRemove?: (url: string) => void
  multiple?: boolean
  maxFiles?: number
}

export default function ImageUploader({ 
  bucket = 'resort-images', 
  onUpload, 
  existingUrls = [],
  onRemove,
  multiple = true,
  maxFiles = 10
}: Props){
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  // Upload images immediately when files are selected
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const files = e.target.files
    if (!files || files.length === 0) return

    const totalFiles = existingUrls.length + files.length
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed. You have ${existingUrls.length} and tried to add ${files.length}.`)
      return
    }

    setUploading(true)
    const newUrls: string[] = []
    const progress: Record<string, number> = {}

    for (let i = 0; i < files.length; i++){
      const file = files[i]
      const fileName = file.name
      progress[fileName] = 0
      setUploadProgress({ ...progress })

      try {
        const filePath = `${Date.now()}_${file.name}`
        const { data, error } = await supabase.storage.from(bucket).upload(filePath, file)
        
        if (error){
          console.error(error)
          toast.error(`Failed to upload ${fileName}`)
          continue
        }

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
        newUrls.push(publicData.publicUrl)
        progress[fileName] = 100
        setUploadProgress({ ...progress })
        toast.success(`Uploaded ${fileName}`)
      } catch (err) {
        console.error(err)
        toast.error(`Error uploading ${fileName}`)
      }
    }

    setUploading(false)
    setUploadProgress({})
    
    if (newUrls.length > 0) {
      onUpload?.(newUrls)
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleRemoveImage(url: string){
    // Extract file path from URL for deletion from storage
    try {
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      // Attempt to delete from storage (may fail if permissions issue, but continue anyway)
      await supabase.storage.from(bucket).remove([fileName])
    } catch (err) {
      console.warn('Could not delete from storage:', err)
    }
    
    onRemove?.(url)
    toast.success('Image removed')
  }

  const allUrls = existingUrls

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <input 
          ref={fileInputRef}
          type="file" 
          multiple={multiple}
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id={`image-input-${inputId}`}
        />
        <label 
          htmlFor={`image-input-${inputId}`}
          className={`inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-300 rounded-xl font-semibold text-slate-700 hover:border-resort-400 hover:bg-resort-50 transition-all cursor-pointer bg-white shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <>
              <FiLoader className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <FiFolder className="w-5 h-5" />
              <span>{multiple ? 'Choose Files' : 'Choose File'}</span>
            </>
          )}
        </label>
        
        {allUrls.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <FiCheck className="text-green-600 w-4 h-4" />
            <span className="text-green-700 font-semibold text-sm">
              {allUrls.length} image{allUrls.length !== 1 ? 's' : ''} uploaded
            </span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-slate-500">
        <p className="flex items-center gap-1">
          <FiInfo className="w-4 h-4" /> 
          <strong>Tip:</strong> Images upload automatically when selected. Maximum {maxFiles} images. Click the × to remove an image.
        </p>
      </div>
      
      {allUrls.length > 0 && (
        <div className="space-y-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <FiCheck className="text-green-600 w-5 h-5" />
            <div className="text-sm font-semibold text-green-800">
              {allUrls.length} image{allUrls.length !== 1 ? 's' : ''} ready
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allUrls.map((url, index) => (
              <div key={url} className="relative group">
                <img 
                  src={url} 
                  alt={`Uploaded ${index + 1}`} 
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-300 shadow-sm group-hover:shadow-md transition-shadow" 
                />
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {index + 1}
                </div>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Remove image"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
