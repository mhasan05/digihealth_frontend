"use client"

import { Loader2 } from 'lucide-react'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGuard('doctor')

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <DashboardLayout pageTitle="Doctor Dashboard">
      {children}
    </DashboardLayout>
  )
}
