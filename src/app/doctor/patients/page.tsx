"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, User, Phone, IdCard, AlertTriangle } from 'lucide-react'
import { PATIENT_CONDITIONS, type PatientCondition } from '@/types'

export default function DoctorPatientsPage() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['doctor-patient-search', query],
    queryFn: () => api.doctor.searchPatients(query),
    enabled: query.trim().length >= 1,
    staleTime: 15_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">রোগী খুঁজুন</h2>
        <p className="text-sm text-slate-500 mt-0.5">নাম, ফোন নম্বর বা Health ID দিয়ে রোগীর প্রোফাইল খুঁজুন</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="যেমন: Rahim, 01700000001, DH-12345..."
          className="w-full pl-9 pr-4 py-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
        />
      </div>

      {query.trim().length < 1 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">খুঁজতে শুরু করুন</p>
        </div>
      ) : isFetching ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
          খুঁজছি...
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <p className="text-sm text-slate-500">কোনো রোগী পাওয়া যায়নি।</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {results.map(p => (
            <li key={p.id}>
              <Link
                href={`/doctor/patients/${p.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    p.hiv_status === 'Positive' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    <User className={`w-6 h-6 ${
                      p.hiv_status === 'Positive' ? 'text-red-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.hiv_status === 'Positive'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        HIV: {p.hiv_status === 'Positive' ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone ?? 'নেই'}</span>
                      <span className="inline-flex items-center gap-1 font-mono"><IdCard className="w-3 h-3" />{p.health_id}</span>
                      <span>{p.age} বছর · {p.gender === 'Male' ? 'পুরুষ' : p.gender === 'Female' ? 'মহিলা' : 'অন্যান্য'}</span>
                    </div>
                    {p.conditions && p.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {PATIENT_CONDITIONS
                          .filter(c => (p.conditions as PatientCondition[]).includes(c.value))
                          .map(c => (
                            <span key={c.value} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                              {c.short}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <span className="text-indigo-600 text-xs font-semibold whitespace-nowrap">দেখুন →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
