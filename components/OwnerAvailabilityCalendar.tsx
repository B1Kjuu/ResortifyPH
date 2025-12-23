import React from 'react'
import { format, startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek } from 'date-fns'

type DayStats = { pending: number; confirmed: number }

export default function OwnerAvailabilityCalendar({
  month,
  dayStats,
  selectedDate,
  onSelectDate,
  weekStartsOn = 0,
  highlightRange,
}: {
  month: Date
  dayStats: Record<string, DayStats>
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  highlightRange?: { from?: string; to?: string }
}){
  const firstOfMonth = startOfMonth(month)
  const lastOfMonth = endOfMonth(month)
  const days: Date[] = []

  // Build complete calendar grid from startOfWeek to endOfWeek based on preference
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn })
  const gridEnd = endOfWeek(lastOfMonth, { weekStartsOn })
  let cursor = gridStart
  while (cursor <= gridEnd) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
    if (days.length > 42) break // safety: max 6 weeks
  }

  const baseLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weekDayLabels = [...baseLabels.slice(weekStartsOn), ...baseLabels.slice(0, weekStartsOn)]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-resort-900">Availability Overview</h4>
        <span className="text-sm text-slate-600">{format(month, 'MMMM yyyy')}</span>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-slate-600 mb-2">
        {weekDayLabels.map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const stats = dayStats[key] || { pending: 0, confirmed: 0 }
          const isCurrentMonth = d.getMonth() === month.getMonth()
          const isSelected = selectedDate === key
          const hasConfirmed = stats.confirmed > 0
          const hasPending = stats.pending > 0
          const base = isCurrentMonth ? 'bg-slate-50' : 'bg-slate-100 opacity-60'
          const color = hasConfirmed ? 'border-green-500' : hasPending ? 'border-yellow-400' : 'border-slate-200'
          const inRange = highlightRange?.from && highlightRange?.to
            ? (new Date(key) >= new Date(highlightRange!.from!) && new Date(key) <= new Date(highlightRange!.to!))
            : false
          const ring = isSelected ? 'ring-2 ring-resort-400' : inRange ? 'ring-2 ring-resort-300' : ''
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate && onSelectDate(key)}
              className={`min-h-16 p-2 rounded-lg border ${base} ${color} ${ring} text-left`}
            >
              <div className="text-xs font-semibold text-slate-700">{format(d, 'd')}</div>
              {(hasPending || hasConfirmed) ? (
                <div className="mt-1 space-y-0.5">
                  {hasConfirmed && (
                    <div className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700 inline-block">{stats.confirmed} confirmed</div>
                  )}
                  {hasPending && (
                    <div className="text-[10px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-700 inline-block">{stats.pending} pending</div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-1">—</div>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-500"></span> confirmed</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400"></span> pending</span>
      </div>
    </div>
  )
}
