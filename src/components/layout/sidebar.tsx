"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, Users, UserCheck, Microscope,
  Stethoscope, BedDouble, FlaskConical, Calendar,
  ClipboardList, TestTube, FileText, ShieldCheck, X,
  HeartPulse, ChevronRight, Settings, UserCog, Activity,
  CheckCircle, Clock, ArrowLeftRight,
} from 'lucide-react'
import type { Portal } from '@/types'
import { PORTAL_ROUTES } from '@/types'
import { useAuthStore } from '@/store/auth-store'

interface NavItem {
  href: string
  labelKey: string
  icon: React.ElementType
}

const NAV_ITEMS: Record<Portal, NavItem[]> = {
  user: [
    { href: '/patient',         labelKey: 'nav.dashboard',        icon: LayoutDashboard },
    { href: '/patient/reports', labelKey: 'nav.myReports',        icon: FileText },
    { href: '/patient/privacy', labelKey: 'nav.privacy',          icon: ShieldCheck },
  ],
  admin: [
    { href: '/admin',           labelKey: 'nav.dashboard',        icon: LayoutDashboard },
    { href: '/admin/hospitals', labelKey: 'nav.hospitals',        icon: Building2 },
  ],
  owner: [
    { href: '/owner',               labelKey: 'nav.dashboard',    icon: LayoutDashboard },
    { href: '/owner/managers',      labelKey: 'nav.managers',     icon: UserCheck },
    { href: '/owner/doctors',       labelKey: 'nav.doctors',      icon: Stethoscope },
    { href: '/owner/nurses',        labelKey: 'nav.nurses',       icon: Activity },
    { href: '/owner/pathologists',  labelKey: 'nav.pathologists', icon: Microscope },
    { href: '/owner/co-owners',     labelKey: 'nav.coOwners',     icon: Users },
    { href: '/owner/beds',          labelKey: 'nav.beds',         icon: BedDouble },
    { href: '/owner/tests',         labelKey: 'nav.tests',        icon: FlaskConical },
  ],
  manager: [
    { href: '/manager',               labelKey: 'nav.dashboard',    icon: LayoutDashboard },
    { href: '/manager/appointments',  labelKey: 'nav.appointments', icon: Calendar },
    { href: '/manager/admissions',    labelKey: 'nav.admissions',   icon: BedDouble },
    { href: '/manager/lab-orders',    labelKey: 'nav.labOrders',    icon: TestTube },
  ],
  pathologist: [
    { href: '/pathologist',           labelKey: 'nav.dashboard',         icon: LayoutDashboard },
    { href: '/pathologist/upcoming',  labelKey: 'nav.upcomingTests',     icon: Clock },
    { href: '/pathologist/completed', labelKey: 'nav.completedReports',  icon: CheckCircle },
  ],
}

const PORTAL_META: Record<Portal, {
  label: string
  icon: React.ElementType
  accent: string
  activeBg: string
  activeText: string
  activeIcon: string
  badge: string
}> = {
  user: {
    label: 'User Portal',
    icon: HeartPulse,
    accent: 'text-green-400',
    activeBg: 'bg-green-500/15 border border-green-500/25',
    activeText: 'text-white',
    activeIcon: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300 border border-green-500/30',
  },
  admin: {
    label: 'Admin Portal',
    icon: ShieldCheck,
    accent: 'text-violet-400',
    activeBg: 'bg-violet-500/15 border border-violet-500/25',
    activeText: 'text-white',
    activeIcon: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  },
  owner: {
    label: 'Owner Portal',
    icon: Building2,
    accent: 'text-blue-400',
    activeBg: 'bg-blue-500/15 border border-blue-500/25',
    activeText: 'text-white',
    activeIcon: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
  manager: {
    label: 'Manager Portal',
    icon: ClipboardList,
    accent: 'text-teal-400',
    activeBg: 'bg-teal-500/15 border border-teal-500/25',
    activeText: 'text-white',
    activeIcon: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  },
  pathologist: {
    label: 'Pathologist Portal',
    icon: Microscope,
    accent: 'text-amber-400',
    activeBg: 'bg-amber-500/15 border border-amber-500/25',
    activeText: 'text-white',
    activeIcon: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
}

interface SidebarProps {
  hospitalName?: string
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ hospitalName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const { activePortal, availablePortals, switchPortal } = useAuthStore()

  const meta = PORTAL_META[activePortal]
  const items = NAV_ITEMS[activePortal]
  const PortalIcon = meta.icon

  const otherPortals = availablePortals.filter(p => p !== activePortal)

  const handleSwitch = (portal: Portal) => {
    switchPortal(portal)
    router.push(PORTAL_ROUTES[portal])
    onClose()
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 z-30 flex flex-col transition-transform duration-300 ease-in-out sidebar-bg',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-900/30">
                <HeartPulse className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0f172a]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">DigiHealth</p>
              <p className="text-slate-400 text-[10px] leading-tight">CMS Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active portal badge */}
        <div className="px-4 pt-4 pb-3">
          <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl', meta.badge)}>
            <PortalIcon className={cn('w-4 h-4 flex-shrink-0', meta.accent)} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-bold leading-tight truncate', meta.activeText)}>
                {t(`portal.${activePortal}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Hospital chip */}
        {hospitalName && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Hospital</p>
            <p className="text-white/80 text-xs font-medium leading-snug truncate">{hospitalName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? cn(meta.activeBg, meta.activeText)
                    : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? meta.activeIcon : 'text-slate-500 group-hover:text-slate-300'
                )} />
                <span className="flex-1">{t(item.labelKey)}</span>
                {isActive && <ChevronRight className={cn('w-3.5 h-3.5 flex-shrink-0', meta.activeIcon)} />}
              </Link>
            )
          })}
        </nav>

        {/* Portal switcher */}
        {otherPortals.length > 0 && (
          <div className="px-3 pb-3 pt-2 border-t border-white/8">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-2 px-1">
              {t('portal.switch')}
            </p>
            <div className="space-y-1">
              {otherPortals.map(portal => {
                const m = PORTAL_META[portal]
                const PIcon = m.icon
                return (
                  <button
                    key={portal}
                    onClick={() => handleSwitch(portal)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-all text-sm font-medium text-left"
                  >
                    <PIcon className={cn('w-4 h-4 flex-shrink-0', m.accent)} />
                    <span className="flex-1 truncate">{t(`portal.${portal}`)}</span>
                    <ArrowLeftRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4 pt-3 border-t border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-slate-600 text-[10px] font-medium">DigiHealth CMS v2.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
