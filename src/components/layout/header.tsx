"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Menu, LogOut, Bell, ChevronDown, Check,
  ArrowLeftRight, HeartPulse, ShieldCheck,
  Building2, ClipboardList, Microscope, Languages,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Portal } from '@/types'
import { PORTAL_ROUTES } from '@/types'

const PORTAL_CONFIG: Record<Portal, {
  icon: React.ElementType
  color: string
  bg: string
  indicator: string
}> = {
  user: {
    icon: HeartPulse,
    color: 'text-green-700',
    bg: 'bg-green-50 hover:bg-green-100 border-green-200',
    indicator: 'bg-green-500',
  },
  admin: {
    icon: ShieldCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    indicator: 'bg-violet-500',
  },
  owner: {
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    indicator: 'bg-blue-500',
  },
  manager: {
    icon: ClipboardList,
    color: 'text-teal-600',
    bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    indicator: 'bg-teal-500',
  },
  pathologist: {
    icon: Microscope,
    color: 'text-amber-600',
    bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    indicator: 'bg-amber-500',
  },
}

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout, activePortal, availablePortals, switchPortal } = useAuthStore()
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const [portalOpen, setPortalOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const portalRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (portalRef.current && !portalRef.current.contains(e.target as Node)) setPortalOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setProfileOpen(false)
    try {
      await api.auth.logout()
    } catch {
      // Backend logout is best-effort — JWT is stateless, so a stale/expired
      // token returning 401 must not block the client-side cleanup below.
    }
    logout()
    router.replace('/login')
  }

  const handleSwitchPortal = (portal: Portal) => {
    switchPortal(portal)
    router.push(PORTAL_ROUTES[portal])
    setPortalOpen(false)
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn')
  }

  const activeMeta = PORTAL_CONFIG[activePortal]
  const ActiveIcon = activeMeta.icon
  const hasMultiplePortals = availablePortals.length > 1

  return (
    <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Left — hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">{title}</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Portal switcher — only shown if user has 2+ portals */}
        {hasMultiplePortals && (
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => { setPortalOpen(o => !o); setProfileOpen(false) }}
              className={cn(
                'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                activeMeta.bg,
                activeMeta.color,
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', activeMeta.indicator)} />
              <ActiveIcon className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{t(`portal.${activePortal}`)}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', portalOpen && 'rotate-180')} />
            </button>

            {portalOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-lg dropdown-shadow z-50 py-1.5 animate-scale-in">
                <div className="px-3 py-2 mb-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{t('portal.switch')}</p>
                </div>
                {availablePortals.map(portal => {
                  const m = PORTAL_CONFIG[portal]
                  const PIcon = m.icon
                  const isActive = portal === activePortal
                  return (
                    <button
                      key={portal}
                      onClick={() => handleSwitchPortal(portal)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors mx-1 rounded-xl',
                        isActive
                          ? 'bg-slate-50 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100'
                      )}>
                        <PIcon className={cn('w-3.5 h-3.5', m.color)} />
                      </div>
                      <span className="flex-1 text-left font-medium text-xs">{t(`portal.${portal}`)}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />}
                      {!isActive && <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-slate-200"
          aria-label={t('lang.switch')}
          title={t('lang.switch')}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{i18n.language === 'bn' ? 'EN' : 'বাং'}</span>
        </button>

        {/* Notification bell */}
        <button
          className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label={t('greeting.notifications')}
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
        </button>

        {/* Profile */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(o => !o); setPortalOpen(false) }}
              className="flex items-center gap-2.5 pl-2 border-l border-slate-100 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors"
            >
              <Avatar name={user.name} portal={activePortal} size="sm" />
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight capitalize">{activePortal} portal</p>
              </div>
              <ChevronDown className={cn('hidden md:block w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-100 shadow-lg dropdown-shadow z-50 py-1.5 animate-scale-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{user.email || user.phone}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.health_id}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t('greeting.signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
