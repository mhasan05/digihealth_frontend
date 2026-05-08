"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { PORTAL_ROUTES } from '@/types'

export default function RootPage() {
  const { _hasHydrated, isAuthenticated, availablePortals } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!_hasHydrated) return
    if (isAuthenticated) {
      router.replace(PORTAL_ROUTES[availablePortals[0]])
    } else {
      router.replace('/login')
    }
  }, [_hasHydrated, isAuthenticated, availablePortals, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  )
}
