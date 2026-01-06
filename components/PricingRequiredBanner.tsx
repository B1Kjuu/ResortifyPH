'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { FiAlertTriangle } from 'react-icons/fi'

interface PricingRequiredBannerProps {
  className?: string
}

export default function PricingRequiredBanner({ className = '' }: PricingRequiredBannerProps) {
  const [resortsNeedingPricing, setResortsNeedingPricing] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPricing() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setLoading(false)
        return
      }

      // Check for approved resorts without pricing
      const { data: resorts } = await supabase
        .from('resorts')
        .select('id, name, status, pricing_config, use_advanced_pricing, price, day_tour_price, night_tour_price, overnight_price')
        .eq('owner_id', session.user.id)
        .eq('status', 'approved')

      const needsPricing = (resorts || []).filter(r => {
        // Parse pricing_config if it's a string
        let pricingConfig = r.pricing_config
        if (typeof pricingConfig === 'string') {
          try { pricingConfig = JSON.parse(pricingConfig) } catch { pricingConfig = null }
        }
        const hasAdvancedPricing = pricingConfig?.pricing && Array.isArray(pricingConfig.pricing) && pricingConfig.pricing.length > 0
        const hasLegacyPricing = !!(r.day_tour_price || r.night_tour_price || r.overnight_price || r.price)
        return !hasAdvancedPricing && !hasLegacyPricing
      }).map(r => ({ id: r.id, name: r.name }))

      setResortsNeedingPricing(needsPricing)
      setLoading(false)
    }
    checkPricing()
  }, [])

  if (loading || resortsNeedingPricing.length === 0) return null

  return (
    <div className={`bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg p-4 border border-red-500 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
          <FiAlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-lg mb-1">🚨 Action Required: Resort Not Visible</h4>
          <p className="text-sm opacity-95 mb-3">
            {resortsNeedingPricing.length === 1 
              ? `Your resort "${resortsNeedingPricing[0].name}" is hidden from guests because it has no pricing configured.`
              : `${resortsNeedingPricing.length} of your approved resorts are hidden from guests because they have no pricing configured.`
            }
          </p>
          <p className="text-xs opacity-80 mb-3">
            Resorts without pricing will not appear in search results or the explore page until you configure pricing.
          </p>
          <div className="flex flex-wrap gap-2">
            {resortsNeedingPricing.slice(0, 3).map(resort => (
              <Link
                key={resort.id}
                href={`/owner/edit-resort/${resort.id}`}
                className="inline-flex items-center gap-1 px-4 py-2 bg-white text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors shadow-sm"
              >
                ⚙️ Configure Pricing: {resort.name.length > 20 ? resort.name.slice(0, 20) + '...' : resort.name}
              </Link>
            ))}
            {resortsNeedingPricing.length > 3 && (
              <Link
                href="/owner/my-resorts"
                className="inline-flex items-center gap-1 px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                +{resortsNeedingPricing.length - 3} more resorts
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
