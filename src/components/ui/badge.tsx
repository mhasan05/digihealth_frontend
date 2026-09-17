import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'teal' | 'purple' | 'rose' | 'sky'
  dot?: boolean
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, { bg: string; dot: string }> = {
  green:  { bg: 'bg-green-50  text-green-700  ring-1 ring-green-200',  dot: 'bg-green-500'  },
  amber:  { bg: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',  dot: 'bg-amber-500'  },
  red:    { bg: 'bg-red-50    text-red-700    ring-1 ring-red-200',    dot: 'bg-red-500'    },
  blue:   { bg: 'bg-blue-50   text-blue-700   ring-1 ring-blue-200',   dot: 'bg-blue-500'   },
  sky:    { bg: 'bg-sky-50    text-sky-700    ring-1 ring-sky-200',    dot: 'bg-sky-500'    },
  gray:   { bg: 'bg-slate-50  text-slate-600  ring-1 ring-slate-200',  dot: 'bg-slate-400'  },
  teal:   { bg: 'bg-teal-50   text-teal-700   ring-1 ring-teal-200',   dot: 'bg-teal-500'   },
  purple: { bg: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500' },
  rose:   { bg: 'bg-rose-50   text-rose-700   ring-1 ring-rose-200',   dot: 'bg-rose-500'   },
}

export function Badge({ children, variant = 'gray', dot = false, className }: BadgeProps) {
  const v = variantClasses[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold',
        v.bg,
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', v.dot)} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  type Cfg = { variant: BadgeProps['variant']; key: string; dot?: boolean }
  const config: Record<string, Cfg> = {
    Active:                { variant: 'green',  key: 'status.active',    dot: true },
    Paused:                { variant: 'amber',  key: 'status.paused',    dot: true },
    Inactive:              { variant: 'gray',   key: 'status.inactive',  dot: true },
    'On-leave':            { variant: 'amber',  key: 'status.onLeave',   dot: true },
    Pending:               { variant: 'amber',  key: 'status.pending',   dot: true },
    Approved:              { variant: 'green',  key: 'status.approved',  dot: true },
    Rejected:              { variant: 'red',    key: 'status.rejected',  dot: true },
    Confirmed:             { variant: 'blue',   key: 'status.confirmed', dot: true },
    Completed:             { variant: 'green',  key: 'status.completed', dot: true },
    Cancelled:             { variant: 'red',    key: 'status.cancelled', dot: true },
    Assigned:              { variant: 'teal',   key: 'status.assigned',  dot: true },
    Available:             { variant: 'green',  key: 'status.available', dot: true },
    Occupied:              { variant: 'rose',   key: 'status.occupied',  dot: true },
    Free:                  { variant: 'sky',    key: 'status.free'                 },
    Premium:               { variant: 'purple', key: 'status.premium'              },
    Normal:                { variant: 'green',  key: 'status.normal'               },
    Abnormal:              { variant: 'red',    key: 'status.abnormal'             },
    'Follow-up required':  { variant: 'amber',  key: 'status.followUp'             },
    admin:                 { variant: 'purple', key: 'role.admin'                  },
    owner:                 { variant: 'blue',   key: 'role.owner'                  },
    manager:               { variant: 'teal',   key: 'role.manager'                },
    pathologist:           { variant: 'amber',  key: 'role.pathologist'            },
    doctor:                { variant: 'blue',   key: 'role.doctor'                 },
    patient:               { variant: 'gray',   key: 'role.patient'                },
  }
  const cfg = config[status]
  return (
    <Badge variant={cfg?.variant ?? 'gray'} dot={cfg?.dot}>
      {cfg ? t(cfg.key) : status}
    </Badge>
  )
}
