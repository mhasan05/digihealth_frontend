"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, HeartPulse } from 'lucide-react'
import type { Nurse } from '@/types'

interface NurseSearchProps {
  nurses: Nurse[]
  selected: Nurse | null
  onSelect: (n: Nurse) => void
  onClear: () => void
  optional?: boolean
}

export function NurseSearch({ nurses, selected, onSelect, onClear, optional = true }: NurseSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const results = query.length >= 1
    ? nurses.filter(n =>
        n.name.toLowerCase().includes(query.toLowerCase()) ||
        (n.ward ?? '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : nurses.slice(0, 8)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (selected) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">নার্স</label>
        <div className="flex items-center justify-between px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">{selected.ward}</p>
            </div>
          </div>
          <button type="button" onClick={onClear}
            className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors">
            পরিবর্তন
          </button>
        </div>
      </div>
    )
  }

  const empty = nurses.length === 0
  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        নার্স খুঁজুন {optional && <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={empty ? 'কোনো খালি নার্স নেই' : 'নাম বা ওয়ার্ড দিয়ে খুঁজুন...'}
          disabled={empty}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {results.map(n => (
              <button key={n.id} type="button"
                onMouseDown={() => { onSelect(n); setQuery(''); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 text-left transition-colors border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{n.name}</p>
                  <p className="text-xs text-slate-400">{n.ward}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 1 && results.length === 0 && !empty && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো খালি নার্স পাওয়া যায়নি</p>
        )}
      </div>
    </div>
  )
}
