import React from 'react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}

export default function Select({ value, onChange, ariaLabel, className = '', children, name, id, ...rest }: SelectProps) {
  return (
    <div className={`relative group ${className ? '' : 'min-w-[110px]'}`}>
      <select
        name={name}
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        {...rest}
        className={`appearance-none w-full px-3 py-2 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-gradient-to-b from-white to-slate-50 shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-resort-400 focus:border-resort-400 focus:bg-white pr-9 cursor-pointer transition-all duration-200 ${className}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
        <svg
          className="w-3.5 h-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
