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
  compact?: boolean // For single-image verification uploads - more compact layout
}

export default function ImageUploader({ 
  bucket = 'resort-images', 
  onUpload, 
  existingUrls = [],
  onRemove,
  multiple = true,
  maxFiles = 10,
  compact = false
}: Props){
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // Compress image before upload - optimized for mobile
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = document.createElement('img')
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Max dimensions for resort images
          const MAX_WIDTH = 1920
          const MAX_HEIGHT = 1920
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Compression failed'))
              }
            },
            'image/jpeg',
            0.88 // 88% quality for resort images
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

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
        // Compress image if it's over 500KB
        let fileToUpload = file
        if (file.size > 500 * 1024) {
          console.log(`🗜️ Compressing ${fileName}...`)
          try {
            fileToUpload = await compressImage(file)
            console.log(`✅ Compressed ${fileName}:`, {
              original: (file.size / 1024).toFixed(1) + ' KB',
              compressed: (fileToUpload.size / 1024).toFixed(1) + ' KB',
              saved: ((1 - fileToUpload.size / file.size) * 100).toFixed(0) + '%'
            })
          } catch (compressionError) {
            console.warn(`⚠️ Compression failed for ${fileName}, using original`)
            fileToUpload = file
          }
        }

        const filePath = `${Date.now()}_${file.name}`
        
        // Mobile-optimized upload with retry
        let uploadData = null
        let uploadError = null
        const maxRetries = isMobile ? 3 : 1
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const timeoutMs = isMobile ? (attempt * 20000) : 30000 // 20s, 40s, 60s on mobile
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
            
            console.log(`📤 Upload attempt ${attempt}/${maxRetries} for ${fileName}`)
            const { data, error } = await supabase.storage
              .from(bucket)
              .upload(filePath, fileToUpload, {
                cacheControl: '3600',
                upsert: false
              })
            
            clearTimeout(timeoutId)
            
            if (!error) {
              uploadData = data
              console.log(`✅ Upload successful for ${fileName}`)
              break
            } else {
              uploadError = error
              console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Wait before retry
              }
            }
          } catch (err: any) {
            console.error(`❌ Attempt ${attempt} error:`, err)
            uploadError = err
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            }
          }
        }
        
        if (uploadError || !uploadData){
          console.error('Final error:', uploadError)
          toast.error(`Failed to upload ${fileName} after ${maxRetries} attempts`)
          continue
        }

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
        newUrls.push(publicData.publicUrl)
        progress[fileName] = 100
        setUploadProgress({ ...progress })
        toast.success(`Uploaded ${fileName}`)
        setDebugInfo(prev => [...prev, `✅ ${fileName} uploaded`])
      } catch (err) {
        console.error(err)
        toast.error(`Error uploading ${fileName}`)
        setDebugInfo(prev => [...prev, `❌ ${fileName} failed`])
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

  // Compact layout for single-image verification uploads
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input 
            ref={fileInputRef}
            type="file" 
            multiple={multiple}
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
            id={`image-input-${inputId}`}
          />
          <label 
            htmlFor={`image-input-${inputId}`}
            className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded-lg font-medium text-sm text-slate-700 hover:border-resort-400 hover:bg-resort-50 transition-all cursor-pointer bg-white shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <FiFolder className="w-4 h-4" />
                <span>Choose File</span>
              </>
            )}
          </label>
          
          {allUrls.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
              <FiCheck className="text-green-600 w-3.5 h-3.5" />
              <span className="text-green-700 font-medium text-xs">Uploaded</span>
            </div>
          )}
        </div>
        
        {/* Debug info for mobile */}
        {isMobile && debugInfo.length > 0 && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            {debugInfo.slice(-3).map((info, i) => (
              <div key={i} className="text-blue-800">{info}</div>
            ))}
          </div>
        )}
        
        {allUrls.length > 0 && (
          <div className="flex gap-2">
            {allUrls.map((url, index) => (
              <div key={url} className="relative group w-16 h-16 flex-shrink-0">
                <img 
                  src={url} 
                  alt={`Uploaded ${index + 1}`} 
                  className="w-full h-full object-cover rounded-lg border-2 border-green-300 shadow-sm" 
                />
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                    title="Remove image"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
          className="sr-only"
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
      
      {/* Debug info for mobile - full layout */}
      {isMobile && debugInfo.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
          {debugInfo.slice(-5).map((info, i) => (
            <div key={i} className="text-blue-800">{info}</div>
          ))}
        </div>
      )}
      
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
