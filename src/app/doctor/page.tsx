"use client"

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Stethoscope, Building2, Users } from 'lucide-react'

export default function DoctorDashboardPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['doctor-me'],
    queryFn: () => api.doctor.getMe(),
  })

  if (isLoading) return <LoadingSpinner />
  if (!me) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
        <Stethoscope className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">ডাক্তার প্রোফাইল পাওয়া যায়নি</h3>
        <p className="text-sm text-slate-500">আপনার অ্যাকাউন্টে ডাক্তার প্রোফাইল নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-20 sm:h-24 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500" />
        <div className="px-4 sm:px-6 pb-5 sm:pb-6">
          <div className="relative z-10 -mt-9 sm:-mt-11 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white shadow-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">Dr. {me.name}</h2>
          {me.specialization && <p className="text-sm text-indigo-700 mt-0.5">{me.specialization}</p>}
          <p className="text-xs text-slate-500 mt-1">
            {me.phone}
            {me.bmdc_registration_no && (
              <span className="ml-2 font-mono">· BMDC: {me.bmdc_registration_no}</span>
            )}
          </p>
        </div>
      </div>

      {/* Hospitals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900">আপনার হাসপাতাল</h3>
        </div>
        {me.hospitals.length === 0 ? (
          <p className="text-sm text-slate-500">এখনো কোনো হাসপাতালে যুক্ত নন। মালিক আপনাকে যুক্ত করলে এখানে দেখা যাবে।</p>
        ) : (
          <ul className="space-y-2">
            {me.hospitals.map(h => (
              <li key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{h.name}</p>
                  {h.schedule && <p className="text-xs text-slate-500 mt-0.5">{h.schedule}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  h.status === 'Active'
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                }`}>
                  {h.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick action */}
      <Link href="/doctor/patients" className="block">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">রোগী খুঁজুন</p>
              <p className="text-xs text-slate-500 mt-0.5">নাম, ফোন বা Health ID দিয়ে রোগীর তথ্য খুঁজে দেখুন</p>
            </div>
            <span className="text-indigo-600 font-semibold">→</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
