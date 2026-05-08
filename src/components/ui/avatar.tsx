import { cn } from '@/lib/utils'
import type { Portal } from '@/types'

const PORTAL_COLORS: Record<Portal, string> = {
  user:        'from-green-500  to-green-600',
  admin:       'from-violet-500 to-violet-600',
  owner:       'from-blue-500   to-blue-600',
  manager:     'from-teal-500   to-teal-600',
  pathologist: 'from-amber-500  to-amber-600',
}

interface AvatarProps {
  name: string
  portal?: Portal
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
}

export function Avatar({ name, portal = 'user', size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm',
        PORTAL_COLORS[portal],
        SIZE[size],
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
