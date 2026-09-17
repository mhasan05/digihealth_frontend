"use client"

import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { ready } = useAuthGuard('user')

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <DashboardLayout pageTitle={t('page.patientDashboard')}>
      {children}
    </DashboardLayout>
  )
}
