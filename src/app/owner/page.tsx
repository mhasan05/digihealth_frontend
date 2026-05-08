"use client"

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { RevenueChart } from '@/components/shared/revenue-chart'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import {
  BedDouble, FlaskConical, Stethoscope, Activity,
  UserCheck, Microscope, Users, TrendingUp, TrendingDown, Building2,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

function FinancialKpi({ label, value, trend, color }: { label: string; value: number; trend: number; color: string }) {
  const isUp = trend >= 0
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs text-slate-400 font-medium mb-2">{label}</p>
      <p className={cn('text-2xl font-extrabold tracking-tight', color)}>{formatCurrency(value)}</p>
      <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold', isUp ? 'text-emerald-600' : 'text-red-500')}>
        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {Math.abs(trend)}% vs last month
      </div>
    </div>
  )
}

function BedBar({ available, total }: { available: number; total: number }) {
  const occupied = total - available
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0
  const color = rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = rate >= 90 ? 'text-red-600' : rate >= 70 ? 'text-amber-600' : 'text-emerald-600'
  const bgColor = rate >= 90 ? 'bg-red-50' : rate >= 70 ? 'bg-amber-50' : 'bg-emerald-50'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <BedDouble className={cn('w-5 h-5', textColor)} />
        </div>
        <span className={cn('text-2xl font-extrabold', textColor)}>{rate}%</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">Bed Occupancy</p>
      <p className="text-xs text-slate-400 mt-0.5">{occupied} occupied · {available} available · {total} total</p>
      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

interface StaffRowItem { icon: React.ElementType; label: string; count: number; bg: string; iconColor: string }
function StaffCard({ title, rows }: { title: string; rows: StaffRowItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      <div className="space-y-3">
        {rows.map(({ icon: Icon, label, count, bg, iconColor }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-3.5 h-3.5', iconColor)} />
              </span>
              <span className="text-sm text-slate-600">{label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OwnerDashboard() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'

  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard', hospitalId],
    queryFn: () => api.owner.getDashboard(hospitalId),
  })

  if (isLoading) return <SkeletonDashboard />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Owner Dashboard</h2>
          </div>
          <p className="text-sm text-slate-500 ml-9">Hospital performance overview</p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FinancialKpi label="Current Revenue" value={data.current_revenue} trend={data.revenue_trend} color="text-blue-700" />
        <FinancialKpi label="Current Expenses" value={data.current_expenses} trend={0} color="text-slate-700" />
        <FinancialKpi label="Net Profit" value={data.current_profit} trend={data.profit_trend} color="text-emerald-700" />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={data.monthly_data} />

      {/* Operational grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <BedBar available={data.beds_available} total={data.beds_total} />

        <StaffCard
          title="Medical Staff"
          rows={[
            { icon: Stethoscope, label: 'Doctors',   count: data.doctors_count,   bg: 'bg-violet-50', iconColor: 'text-violet-600' },
            { icon: Activity,    label: 'Nurses',    count: data.nurses_count,    bg: 'bg-pink-50',   iconColor: 'text-pink-600'   },
          ]}
        />

        <StaffCard
          title="Operations Staff"
          rows={[
            { icon: UserCheck,  label: 'Managers',     count: data.managers_count,     bg: 'bg-teal-50',   iconColor: 'text-teal-600'   },
            { icon: Microscope, label: 'Pathologists', count: data.pathologists_count, bg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
          ]}
        />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-2xl font-extrabold text-sky-700">{data.active_tests}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">Active Lab Tests</p>
          <p className="text-xs text-slate-400 mt-0.5">Available for patients</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Blood', 'Urine', 'X-Ray', 'More…'].map(tag => (
              <span key={tag} className="text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
