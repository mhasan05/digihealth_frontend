"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, Microscope } from 'lucide-react'
import type { Pathologist } from '@/types'

type PathologistWithLoad = Pathologist & { active_test_count?: number }

interface PathologistSearchProps {
  pathologists: PathologistWithLoad[]
  selected: PathologistWithLoad | null
  onSelect: (p: PathologistWithLoad) => void
  onClear: () => void
  error?: string
  optional?: boolean
}

export function PathologistSearch({
  pathologists,
  selected,
  onSelect,
  onClear,
  error,
  optional = false,
}: PathologistSearchProps) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const active = pathologists.filter(p => p.status === 'Active')
  const q = query.trim().toLowerCase()
  const results = q.length >= 1
    ? active.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.specialization ?? '').toLowerCase().includes(q) ||
        p.name.includes(query) ||
        (p.specialization ?? '').includes(query)
      ).slice(0, 8)
    : active.slice(0, 8)

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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">প্যাথলজিস্ট</label>
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Microscope className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">
                {selected.specialization || 'General'}
                {selected.active_test_count != null && (
                  <span className="ml-1 text-amber-600">· সক্রিয় টেস্ট: {selected.active_test_count}</span>
                )}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClear}
            className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors">
            পরিবর্তন
          </button>
        </div>
      </div>
    )
  }

  const empty = active.length === 0
  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        প্যাথলজিস্ট খুঁজুন {optional && <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={empty ? 'কোনো প্যাথলজিস্ট নেই' : 'নাম বা বিশেষজ্ঞতা দিয়ে খুঁজুন...'}
          disabled={empty}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {results.map(p => (
              <button key={p.id} type="button"
                onMouseDown={() => { onSelect(p); setQuery(''); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 text-left transition-colors border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Microscope className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {p.specialization || 'General'}
                    {p.active_test_count != null && (
                      <span className="ml-1 text-amber-600">· সক্রিয় টেস্ট: {p.active_test_count}</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && q.length >= 1 && results.length === 0 && !empty && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো প্যাথলজিস্ট পাওয়া যায়নি</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
