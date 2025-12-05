import React from 'react'

export default function Home(){
  return (
    <section className="py-12">
      <div className="container">
        <div className="grid gap-8">
          <header className="text-center">
            <h1 className="text-4xl font-bold">ResortifyPH</h1>
            <p className="mt-2 text-slate-600">Book private resorts in Manila, Antipolo, and Rizal.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg">Find resorts near you</div>
            <div className="p-6 border rounded-lg">List your resort as an owner</div>
            <div className="p-6 border rounded-lg">Manage bookings</div>
          </div>
        </div>
      </div>
    </section>
  )
}
