import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import type { Portal } from '@/types'

/**
 * Waits for Zustand to rehydrate from localStorage, then enforces auth + portal access.
 * Returns `ready = true` only when it's safe to render the protected page.
 */
export function useAuthGuard(requiredPortal?: Portal) {
  const { _hasHydrated, isAuthenticated, availablePortals, switchPortal } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!_hasHydrated) return  // wait for localStorage rehydration

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (requiredPortal && !availablePortals.includes(requiredPortal)) {
      router.replace('/patient')
      return
    }

    if (requiredPortal) switchPortal(requiredPortal)
  }, [_hasHydrated, isAuthenticated, availablePortals, requiredPortal, switchPortal, router])

  const ready = _hasHydrated &&
    isAuthenticated &&
    (!requiredPortal || availablePortals.includes(requiredPortal))

  return { ready }
}
