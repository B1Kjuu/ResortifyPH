'use client'
import React, { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function RegisterPage(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'guest'|'owner'>('guest')
  const router = useRouter()

  async function handleRegister(e: React.FormEvent){
    e.preventDefault()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error){ alert(error.message); return }

    // create profile row (server should do this via webhook in production)
    const user = data.user
    if (user){
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, role, created_at: new Date() })
    }

    if (role === 'owner') router.push('/dashboard')
    else router.push('/')
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Create account</h2>
      <form onSubmit={handleRegister} className="space-y-3">
        <input className="w-full p-2 border rounded" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <label className="flex items-center gap-2"><input type="radio" name="role" checked={role==='guest'} onChange={()=>setRole('guest')} /> Guest</label>
          <label className="flex items-center gap-2"><input type="radio" name="role" checked={role==='owner'} onChange={()=>setRole('owner')} /> Owner</label>
        </div>
        <button className="px-4 py-2 bg-resortify-500 text-white rounded">Create account</button>
      </form>
    </div>
  )
}
