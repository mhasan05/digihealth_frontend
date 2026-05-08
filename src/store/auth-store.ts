import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Portal } from '@/types'
import { derivePortals } from '@/types'

const COOKIE = 'dh_auth'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

function setCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Strict`
}

function clearCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Strict`
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  activePortal: Portal
  availablePortals: Portal[]
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (user: User, token: string) => void
  logout: () => void
  switchPortal: (portal: Portal) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      activePortal: 'user',
      availablePortals: ['user'],
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: (user, token) => {
        const portals = derivePortals(user.roles)
        setCookie()
        set({ user, accessToken: token, isAuthenticated: true, availablePortals: portals, activePortal: portals[0] })
      },
      logout: () => {
        clearCookie()
        set({ user: null, accessToken: null, isAuthenticated: false, activePortal: 'user', availablePortals: ['user'] })
      },
      switchPortal: (portal) => set({ activePortal: portal }),
    }),
    {
      name: 'digihealth-auth',
      // _hasHydrated and setHasHydrated are not persisted — they reset to false on every load
      partialize: (s) => ({
        user:             s.user,
        accessToken:      s.accessToken,
        isAuthenticated:  s.isAuthenticated,
        activePortal:     s.activePortal,
        availablePortals: s.availablePortals,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
