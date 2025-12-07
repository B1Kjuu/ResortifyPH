'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Resort {
  id: string
  name: string
  location: string
  price: number
  images?: string[]
}

type Props = {
  resort: Resort
}

export default function ResortCard({ resort }: Props){
  const image = resort.images?.[0] || ''
  return (
    <article className="border rounded-lg overflow-hidden">
      <div className="h-48 bg-slate-100 relative">
        {image ? (
          <Image 
            src={image} 
            alt={resort.name} 
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{resort.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{resort.location}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold">₱{resort.price}</span>
          <Link href={`/resorts/${resort.id}`} className="text-sm text-resort-500">View</Link>
        </div>
      </div>
    </article>
  )
}
