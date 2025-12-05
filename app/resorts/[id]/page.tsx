import React from 'react'
import { supabase } from '../../../lib/supabaseClient'

async function getResort(id: string){
  const { data } = await supabase.from('resorts').select('*').eq('id', id).single()
  return data
}

export default async function ResortDetail({ params }: { params: { id: string } }){
  const resort = await getResort(params.id)
  if (!resort) return <div>Resort not found</div>

  return (
    <section>
      <h2 className="text-2xl font-semibold">{resort.name}</h2>
      <p className="text-slate-600">{resort.location} — ₱{resort.price}</p>
      <div className="mt-4">
        <p>{resort.description}</p>
      </div>
    </section>
  )
}
