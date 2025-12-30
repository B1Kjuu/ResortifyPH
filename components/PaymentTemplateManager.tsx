"use client"

import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiCheck, FiX } from 'react-icons/fi'
import supabase from '@/lib/supabaseClient'
import { PaymentTemplate, PaymentMethod, PAYMENT_METHODS } from '@/types/payment'

type Props = {
  onSelectTemplate?: (template: PaymentTemplate) => void
  selectionMode?: boolean
}

export default function PaymentTemplateManager({ onSelectTemplate, selectionMode = false }: Props) {
  const [templates, setTemplates] = useState<PaymentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    payment_method: 'gcash' as PaymentMethod,
    account_name: '',
    account_number: '',
    bank_name: '',
    additional_notes: '',
    is_default: false
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from('payment_templates')
        .select('*')
        .eq('owner_id', user.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err: any) {
      console.error('Error fetching templates:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      payment_method: 'gcash',
      account_name: '',
      account_number: '',
      bank_name: '',
      additional_notes: '',
      is_default: false
    })
    setEditingTemplate(null)
    setShowForm(false)
    setError(null)
  }

  const handleEdit = (template: PaymentTemplate) => {
    setFormData({
      name: template.name,
      payment_method: template.payment_method,
      account_name: template.account_name,
      account_number: template.account_number,
      bank_name: template.bank_name || '',
      additional_notes: template.additional_notes || '',
      is_default: template.is_default
    })
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.account_name.trim() || !formData.account_number.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const templateData = {
        owner_id: user.user.id,
        name: formData.name.trim(),
        payment_method: formData.payment_method,
        account_name: formData.account_name.trim(),
        account_number: formData.account_number.trim(),
        bank_name: formData.payment_method === 'bank_transfer' ? formData.bank_name.trim() : null,
        additional_notes: formData.additional_notes.trim() || null,
        is_default: formData.is_default,
        updated_at: new Date().toISOString()
      }

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('payment_templates')
          .update({ is_default: false })
          .eq('owner_id', user.user.id)
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('payment_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_templates')
          .insert(templateData)
        
        if (error) throw error
      }

      await fetchTemplates()
      resetForm()
    } catch (err: any) {
      console.error('Error saving template:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this payment template?')) return

    try {
      const { error } = await supabase
        .from('payment_templates')
        .delete()
        .eq('id', templateId)
      
      if (error) throw error
      await fetchTemplates()
    } catch (err: any) {
      console.error('Error deleting template:', err)
      setError(err.message)
    }
  }

  const handleSetDefault = async (templateId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      // Unset all defaults first
      await supabase
        .from('payment_templates')
        .update({ is_default: false })
        .eq('owner_id', user.user.id)

      // Set new default
      await supabase
        .from('payment_templates')
        .update({ is_default: true })
        .eq('id', templateId)

      await fetchTemplates()
    } catch (err: any) {
      console.error('Error setting default:', err)
      setError(err.message)
    }
  }

  const getMethodInfo = (method: PaymentMethod) => {
    return PAYMENT_METHODS.find(m => m.id === method) || PAYMENT_METHODS[3]
  }

  const formatTemplateMessage = (template: PaymentTemplate): string => {
    const method = getMethodInfo(template.payment_method)
    const lines = [
      `💳 **Payment Details**`,
      ``,
      `**Method:** ${method.icon} ${method.label}${template.bank_name ? ` (${template.bank_name})` : ''}`,
      `**Account Name:** ${template.account_name}`,
      `**Account Number:** ${template.account_number}`,
    ]
    
    if (template.additional_notes) {
      lines.push(``, `📝 ${template.additional_notes}`)
    }
    
    lines.push(``, `Please send a receipt screenshot after payment.`)
    
    return lines.join('\n')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-slate-600 mb-4">No payment templates yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      ) : (
        <>
          {templates.map(template => {
            const method = getMethodInfo(template.payment_method)
            return (
              <div
                key={template.id}
                className={`p-4 bg-white border rounded-xl transition-all ${
                  selectionMode ? 'cursor-pointer hover:border-cyan-400 hover:shadow-md' : ''
                } ${template.is_default ? 'border-cyan-300 bg-cyan-50/50' : 'border-slate-200'}`}
                onClick={() => selectionMode && onSelectTemplate?.(template)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{method.icon}</span>
                      <h4 className="font-semibold text-slate-800 truncate">{template.name}</h4>
                      {template.is_default && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full">
                          <FiStar className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{method.label}{template.bank_name ? ` • ${template.bank_name}` : ''}</p>
                    <p className="text-sm text-slate-500 mt-1">{template.account_name} • {template.account_number}</p>
                  </div>
                  
                  {!selectionMode && (
                    <div className="flex items-center gap-1">
                      {!template.is_default && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetDefault(template.id) }}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Set as default"
                        >
                          <FiStar className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(template) }}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id) }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!showForm && !selectionMode && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-cyan-400 hover:text-cyan-600 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Add Template
            </button>
          )}
        </>
      )}

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <h4 className="font-semibold text-slate-800">
            {editingTemplate ? 'Edit Template' : 'New Payment Template'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g., My GCash"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, payment_method: method.id }))}
                  className={`flex items-center gap-2 p-3 border rounded-lg transition-all ${
                    formData.payment_method === method.id
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {formData.payment_method === 'bank_transfer' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={e => setFormData(d => ({ ...d, bank_name: e.target.value }))}
                placeholder="e.g., BPI, BDO, Metrobank"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
            <input
              type="text"
              value={formData.account_name}
              onChange={e => setFormData(d => ({ ...d, account_name: e.target.value }))}
              placeholder="Full name on account"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
            <input
              type="text"
              value={formData.account_number}
              onChange={e => setFormData(d => ({ ...d, account_number: e.target.value }))}
              placeholder="GCash/Bank account number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <textarea
              value={formData.additional_notes}
              onChange={e => setFormData(d => ({ ...d, additional_notes: e.target.value }))}
              placeholder="Any extra instructions for guests..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={e => setFormData(d => ({ ...d, is_default: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-600">Set as default template</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <FiCheck className="w-4 h-4" />
              )}
              {editingTemplate ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
