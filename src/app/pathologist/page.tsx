"use client"

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import { FlaskConical, CheckCircle, ClipboardList, ArrowRight, Microscope } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  sub?: string
  color: { bg: string; icon: string; value: string; border: string }
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border shadow-sm p-6 card-lift', color.border)}>
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', color.bg)}>
        <Icon className={cn('w-6 h-6', color.icon)} />
      </div>
      <p className={cn('text-4xl font-extrabold tracking-tight', color.value)}>{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PathologistDashboard() {
  const { user } = useAuthStore()
  const pathologistId = user?.id ?? 'p1'

  const { data, isLoading } = useQuery({
    queryKey: ['pathologist-dashboard', pathologistId],
    queryFn: () => api.pathologist.getDashboard(pathologistId),
  })

  if (isLoading) return <SkeletonDashboard />
  if (!data) return null

  const completionRate = data.total_assigned > 0
    ? Math.round((data.completed_today / data.total_assigned) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pathologist Dashboard</h2>
        </div>
        <p className="text-sm text-slate-500 ml-9">Your assigned test summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={FlaskConical}
          label="Assigned & Pending"
          value={data.assigned_pending}
          sub="Tests awaiting processing"
          color={{ bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700', border: 'border-amber-100' }}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value={data.completed_today}
          sub="Reports submitted today"
          color={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', value: 'text-emerald-700', border: 'border-emerald-100' }}
        />
        <StatCard
          icon={ClipboardList}
          label="Total Assigned"
          value={data.total_assigned}
          sub="All-time assigned tests"
          color={{ bg: 'bg-sky-50', icon: 'text-sky-600', value: 'text-sky-700', border: 'border-sky-100' }}
        />
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Today's Progress</p>
            <p className="text-xs text-slate-400 mt-0.5">{data.completed_today} of {data.total_assigned} tests completed</p>
          </div>
          <span className="text-2xl font-extrabold text-slate-900">{completionRate}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <Link
            href="/pathologist/upcoming"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-semibold transition-colors border border-amber-100"
          >
            <FlaskConical className="w-4 h-4" />
            Process Tests
            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
          </Link>
          <Link
            href="/pathologist/completed"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-colors border border-slate-100"
          >
            <CheckCircle className="w-4 h-4" />
            View Reports
            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  )
}
