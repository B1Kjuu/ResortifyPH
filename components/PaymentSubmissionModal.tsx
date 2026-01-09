"use client"

import { useState, useRef, useEffect } from 'react'
import { FiX, FiUpload, FiCheck, FiImage, FiAlertCircle } from 'react-icons/fi'
import supabase from '@/lib/supabaseClient'
import { PaymentMethod, PAYMENT_METHODS, PaymentSubmission } from '@/types/payment'

type Props = {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  chatId?: string
  expectedAmount?: number
  onSuccess?: (submission: PaymentSubmission) => void
}

export default function PaymentSubmissionModal({
  isOpen,
  onClose,
  bookingId,
  chatId,
  expectedAmount,
  onSuccess
}: Props) {
  const [amount, setAmount] = useState(expectedAmount?.toString() || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(expectedAmount?.toString() || '')
      setPaymentMethod('gcash')
      setReferenceNumber('')
      setNotes('')
      setReceiptFile(null)
      setReceiptPreview(null)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, expectedAmount])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📁 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    })

    // Validate file type - be more lenient on mobile
    const isImage = file.type.startsWith('image/') || 
                    file.name.toLowerCase().endsWith('.heic') ||
                    file.name.toLowerCase().endsWith('.heif')
    
    if (!isImage) {
      setError('Please upload an image file (JPG, PNG, HEIC, etc.)')
      return
    }

    // Validate file size (max 10MB for mobile - they might have high-res cameras)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB. Try taking a new photo with lower quality.')
      return
    }

    setReceiptFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string)
    }
    reader.onerror = () => {
      console.error('❌ FileReader error')
      setError('Failed to read image file. Please try a different photo.')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    // Validate
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!receiptFile) {
      setError('Please upload your payment receipt')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      // Check if bucket exists before attempting upload
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.id === 'payment-receipts')
      
      if (bucketError) {
        console.error('❌ Bucket check failed:', bucketError)
        throw new Error('Storage check failed: ' + bucketError.message)
      }
      
      if (!bucketExists) {
        console.error('❌ payment-receipts bucket does not exist!')
        throw new Error('Payment receipts storage is not configured. Please contact support with error code: BUCKET_NOT_FOUND')
      }

      // Upload receipt image
      setUploading(true)
      console.log('📤 Starting receipt upload...', {
        size: receiptFile.size,
        type: receiptFile.type,
        name: receiptFile.name
      })
      
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${user.user.id}/${bookingId}/${Date.now()}.${fileExt}`
      
      console.log('📁 Upload path:', fileName)
      
      // Add timeout wrapper for mobile networks
      const uploadPromise = supabase.storage
        .from('payment-receipts')
        .upload(fileName, receiptFile, {
          cacheControl: '3600',
          upsert: false,
        })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds. Please check your internet connection.')), 30000)
      )
      
      const { data: uploadData, error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as any

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(uploadError.message || 'Failed to upload receipt')
      }
      
      if (!uploadData) {
        throw new Error('Upload returned no data')
      }
      
      console.log('✅ Upload successful:', uploadData)
      setUploading(false)

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(uploadData.path)

      // Create payment submission record
      const { data: submission, error: submitError } = await supabase
        .from('payment_submissions')
        .insert({
          booking_id: bookingId,
          chat_id: chatId || null,
          submitted_by: user.user.id,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          receipt_url: publicUrl,
          notes: notes.trim() || null,
          status: 'pending'
        })
        .select()
        .single()

      if (submitError) throw submitError

      // Update booking payment status to pending
      await supabase
        .from('bookings')
        .update({ payment_status: 'pending' })
        .eq('id', bookingId)

      setSuccess(true)
      onSuccess?.(submission)

      // Close after showing success
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error('❌ Error submitting payment:', err)
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        status: err?.status,
        name: err?.name
      })
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to submit payment'
      const errMsg = err?.message?.toLowerCase() || ''
      
      if (errMsg.includes('bucket') || errMsg.includes('storage') || errMsg.includes('not found')) {
        errorMessage = 'Unable to upload receipt. The storage bucket may not be configured. Please contact support.'
      } else if (errMsg.includes('permission') || errMsg.includes('policy') || errMsg.includes('not authorized') || errMsg.includes('jwt')) {
        errorMessage = 'Authentication error. Please sign out and sign in again, then retry.'
      } else if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('load failed') || errMsg.includes('failed to fetch') || err?.status === 0) {
        errorMessage = 'Network error. Please check your internet connection and try again. If on mobile data, try WiFi.'
      } else if (errMsg.includes('cors') || errMsg.includes('cross-origin')) {
        errorMessage = 'Browser security error. Please try a different browser or contact support.'
      } else if (errMsg.includes('timeout')) {
        errorMessage = 'Upload timed out. Your internet may be slow. Try again with a smaller image.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Submit Payment</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {success ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Payment Submitted!</h3>
              <p className="text-slate-600">The host will verify your payment shortly.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex flex-col gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-700 mb-1">{error}</p>
                      {error.includes('Network') && (
                        <details className="text-xs text-red-600 mt-2">
                          <summary className="cursor-pointer font-medium">Troubleshooting tips</summary>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Make sure you're logged in</li>
                            <li>Try closing and reopening the app</li>
                            <li>Check if you can access other parts of the site</li>
                            <li>Try WiFi instead of mobile data</li>
                            <li>Clear browser cache and retry</li>
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Paid <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 text-lg font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                        paymentMethod === method.id
                          ? 'border-cyan-500 bg-cyan-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="font-medium text-slate-700">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder={`${selectedMethod?.label || 'Transaction'} reference #`}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Receipt Screenshot <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,image/jpeg,image/png,image/jpg,image/heic"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {receiptPreview ? (
                  <div className="relative group">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full h-48 object-contain bg-slate-100 rounded-xl border border-slate-200"
                    />
                    <button
                      onClick={() => {
                        setReceiptFile(null)
                        setReceiptPreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-cyan-400 hover:bg-cyan-50/50 active:bg-cyan-100 transition-colors touch-manipulation"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <FiImage className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-base font-medium text-slate-700 mb-1">Upload Receipt</p>
                      <p className="text-sm text-slate-500">Tap to choose photo or take picture</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !amount || !receiptFile}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-cyan-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {uploading ? 'Uploading...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <FiUpload className="w-5 h-5" />
                    Submit Payment Proof
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
