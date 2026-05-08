import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: { value: number; label: string }
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'teal'
  className?: string
  sub?: string
}

const colorMap = {
  green:  { accent: 'bg-green-500',  icon: 'bg-green-50  text-green-600',  bar: 'from-green-500  to-emerald-500', text: 'text-green-700'  },
  blue:   { accent: 'bg-blue-500',   icon: 'bg-blue-50   text-blue-600',   bar: 'from-blue-500   to-sky-500',     text: 'text-blue-700'   },
  amber:  { accent: 'bg-amber-500',  icon: 'bg-amber-50  text-amber-600',  bar: 'from-amber-500  to-orange-500',  text: 'text-amber-700'  },
  red:    { accent: 'bg-red-500',    icon: 'bg-red-50    text-red-600',    bar: 'from-red-500    to-rose-500',    text: 'text-red-700'    },
  purple: { accent: 'bg-purple-500', icon: 'bg-purple-50 text-purple-600', bar: 'from-purple-500 to-violet-500',  text: 'text-purple-700' },
  teal:   { accent: 'bg-teal-500',   icon: 'bg-teal-50   text-teal-600',   bar: 'from-teal-500   to-cyan-500',    text: 'text-teal-700'   },
}

export function StatCard({ icon: Icon, label, value, trend, color = 'green', sub, className }: StatCardProps) {
  const c = colorMap[color]

  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', c.bar)} />

      <div className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg',
              trend.value >= 0
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            )}>
              {trend.value >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
          <p className="text-sm font-medium text-slate-500 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
