"use client"

import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'

export default function PathologistLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGuard('pathologist')
  const { user } = useAuthStore()

  const { data: hospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn:  () => api.admin.getHospitals(),
    enabled:  ready && !!user?.active_hospital_id,
  })

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  const hospital = hospitals?.find((h) => h.id === user?.active_hospital_id)

  return (
    <DashboardLayout pageTitle="Pathologist Dashboard" hospitalName={hospital?.name_en}>
      {children}
    </DashboardLayout>
  )
}
