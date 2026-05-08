"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, Stethoscope } from 'lucide-react'
import type { Doctor } from '@/types'

interface DoctorSearchProps {
  doctors: Doctor[]
  selected: Doctor | null
  onSelect: (d: Doctor) => void
  onClear: () => void
  error?: string
  optional?: boolean
}

export function DoctorSearch({ doctors, selected, onSelect, onClear, error, optional = false }: DoctorSearchProps) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const results = query.length >= 1
    ? doctors.filter(d =>
        d.name.includes(query) ||
        d.specialization.toLowerCase().includes(query.toLowerCase()) ||
        d.specialization.includes(query)
      ).slice(0, 8)
    : doctors.slice(0, 8)

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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">ডাক্তার</label>
        <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">{selected.specialization}</p>
            </div>
          </div>
          <button type="button" onClick={onClear}
            className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors">
            পরিবর্তন
          </button>
        </div>
      </div>
    )
  }

  const empty = doctors.length === 0
  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        ডাক্তার খুঁজুন {optional && <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={empty ? 'কোনো ডাক্তার নেই' : 'নাম বা বিশেষজ্ঞতা দিয়ে খুঁজুন...'}
          disabled={empty}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {results.map(d => (
              <button key={d.id} type="button"
                onMouseDown={() => { onSelect(d); setQuery(''); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left transition-colors border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.specialization}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 2 && results.length === 0 && !empty && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো ডাক্তার পাওয়া যায়নি</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
