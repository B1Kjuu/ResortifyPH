import React from 'react'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}

export default function Select({ value, onChange, ariaLabel, className = '', children, name, id, ...rest }: SelectProps) {
  return (
    <div className={`relative ${className ? '' : 'min-w-[110px]'}`}>
      <select
        name={name}
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        {...rest}
        className={`appearance-none w-full px-3 py-2 h-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-400 bg-white pr-9 ${className}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
