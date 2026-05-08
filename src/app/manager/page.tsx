"use client"

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import {
  CalendarCheck, Clock, BedDouble, FlaskConical,
  ClipboardList, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface QuickLinkProps {
  href: string
  icon: React.ElementType
  label: string
  description: string
  color: { bg: string; icon: string; border: string }
}

function QuickLink({ href, icon: Icon, label, description, color }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color.bg, `border ${color.border}`)}>
        <Icon className={cn('w-5 h-5', color.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  sub?: string
  color: { bg: string; icon: string; value: string }
  urgent?: boolean
}

function StatCard({ icon: Icon, label, value, sub, color, urgent }: StatCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-5 card-lift',
      urgent && value > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color.bg)}>
          <Icon className={cn('w-5 h-5', color.icon)} />
        </div>
        {urgent && value > 0 && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg">
            Action needed
          </span>
        )}
      </div>
      <p className={cn('text-3xl font-extrabold tracking-tight', color.value)}>{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ManagerDashboard() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'

  const { data, isLoading, error } = useQuery({
    queryKey: ['manager-dashboard', hospitalId],
    queryFn: () => api.manager.getDashboard(hospitalId),
    retry: false,
  })

  if (isLoading) return <SkeletonDashboard />
  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
        <ClipboardList className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">ম্যানেজার প্রোফাইল পাওয়া যায়নি</h3>
        <p className="text-sm text-slate-500">
          {error instanceof Error ? error.message : 'আপনার অ্যাকাউন্টে ম্যানেজার প্রোফাইল নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manager Dashboard</h2>
        </div>
        <p className="text-sm text-slate-500 ml-9">Today's operational summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarCheck}
          label="Today's Appointments"
          value={data.todays_appointments}
          color={{ bg: 'bg-sky-50', icon: 'text-sky-600', value: 'text-sky-700' }}
        />
        <StatCard
          icon={Clock}
          label="Pending Confirmations"
          value={data.pending_confirmations}
          urgent
          color={{ bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700' }}
        />
        <StatCard
          icon={BedDouble}
          label="Currently Admitted"
          value={data.currently_admitted}
          color={{ bg: 'bg-teal-50', icon: 'text-teal-600', value: 'text-teal-700' }}
        />
        <StatCard
          icon={FlaskConical}
          label="Pending Lab Orders"
          value={data.pending_lab_orders}
          urgent
          color={{ bg: 'bg-rose-50', icon: 'text-rose-600', value: 'text-rose-700' }}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink
            href="/manager/appointments"
            icon={CalendarCheck}
            label="Manage Appointments"
            description="View, confirm, or cancel bookings"
            color={{ bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100' }}
          />
          <QuickLink
            href="/manager/admissions"
            icon={BedDouble}
            label="Patient Admissions"
            description="Assign beds and nurses"
            color={{ bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-100' }}
          />
          <QuickLink
            href="/manager/lab-orders"
            icon={FlaskConical}
            label="Lab Orders"
            description="Assign tests to pathologists"
            color={{ bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' }}
          />
        </div>
      </div>
    </div>
  )
}
