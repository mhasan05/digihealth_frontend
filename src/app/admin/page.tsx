"use client"

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import {
  Building2, Users, UserCheck, User, Activity, Clock,
  TrendingUp, Shield, BarChart3,
} from 'lucide-react'

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: number
  trend?: string
  color: { icon: string; bg: string; text: string }
}

function KpiCard({ icon: Icon, label, value, trend, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 card-lift">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className={`text-2xl font-extrabold tracking-tight ${color.text}`}>{value.toLocaleString()}</p>
      <p className="text-slate-500 text-xs font-medium mt-1">{label}</p>
    </div>
  )
}

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  hospital_created:     { icon: Building2,  bg: 'bg-blue-50',   color: 'text-blue-600'   },
  patient_registered:   { icon: User,       bg: 'bg-sky-50',    color: 'text-sky-600'    },
  appointment_created:  { icon: Activity,   bg: 'bg-teal-50',   color: 'text-teal-600'   },
  lab_result_submitted: { icon: BarChart3,  bg: 'bg-amber-50',  color: 'text-amber-600'  },
  patient_admitted:     { icon: UserCheck,  bg: 'bg-emerald-50',color: 'text-emerald-600'},
  owner_added:          { icon: Users,      bg: 'bg-violet-50', color: 'text-violet-600' },
  hospital_updated:     { icon: Building2,  bg: 'bg-slate-100', color: 'text-slate-600'  },
  appointment_confirmed:{ icon: Activity,   bg: 'bg-green-50',  color: 'text-green-600'  },
  lab_order_created:    { icon: BarChart3,  bg: 'bg-orange-50', color: 'text-orange-600' },
  manager_added:        { icon: UserCheck,  bg: 'bg-teal-50',   color: 'text-teal-600'   },
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.admin.getDashboard(),
  })

  if (isLoading) return <SkeletonDashboard />
  if (!data) return null

  const kpis: KpiCardProps[] = [
    {
      icon: Building2,
      label: 'Total Hospitals',
      value: data.total_hospitals,
      trend: '+12%',
      color: { icon: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    },
    {
      icon: Users,
      label: 'Hospital Owners',
      value: data.total_owners,
      color: { icon: 'text-violet-600', bg: 'bg-violet-50', text: 'text-violet-700' },
    },
    {
      icon: UserCheck,
      label: 'Active Managers',
      value: data.total_managers,
      color: { icon: 'text-teal-600', bg: 'bg-teal-50', text: 'text-teal-700' },
    },
    {
      icon: User,
      label: 'Registered Patients',
      value: data.total_patients,
      trend: '+8%',
      color: { icon: 'text-sky-600', bg: 'bg-sky-50', text: 'text-sky-700' },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Admin Overview</h2>
          </div>
          <p className="text-sm text-slate-500 ml-9">System-wide statistics and recent activity</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-400">Last 10 system events</p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-100" />
            <div className="space-y-3">
              {data.recent_activity.map((event) => {
                const meta = ACTIVITY_ICONS[event.type] ?? { icon: Clock, bg: 'bg-slate-100', color: 'text-slate-500' }
                const EventIcon = meta.icon
                return (
                  <div key={event.id} className="flex items-start gap-4 relative">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 border-white shadow-sm ${meta.bg}`}>
                      <EventIcon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-3.5 py-2.5">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(event.timestamp)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
