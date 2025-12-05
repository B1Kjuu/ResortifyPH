import React from 'react'
import ResortCard from '../../components/ResortCard'
import { supabase } from '../../lib/supabaseClient'

async function getResorts(){
  const { data, error } = await supabase.from('resorts').select('*').eq('status','approved')
  if (error) return []
  return data || []
}

export default async function ResortsPage(){
  const resorts = await getResorts()
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Resorts</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {resorts.map((r: any) => <ResortCard key={r.id} resort={r} />)}
      </div>
    </section>
  )
}
