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
  type Cfg = { variant: BadgeProps['variant']; label: string; dot?: boolean }
  const config: Record<string, Cfg> = {
    Active:                { variant: 'green',  label: 'সক্রিয়',           dot: true },
    Paused:                { variant: 'amber',  label: 'বিরতি',             dot: true },
    Inactive:              { variant: 'gray',   label: 'নিষ্ক্রিয়',         dot: true },
    'On-leave':            { variant: 'amber',  label: 'ছুটিতে',            dot: true },
    Pending:               { variant: 'amber',  label: 'অপেক্ষমান',          dot: true },
    Confirmed:             { variant: 'blue',   label: 'নিশ্চিত',            dot: true },
    Completed:             { variant: 'green',  label: 'সম্পন্ন',            dot: true },
    Cancelled:             { variant: 'red',    label: 'বাতিল',             dot: true },
    Assigned:              { variant: 'teal',   label: 'নিযুক্ত',            dot: true },
    Available:             { variant: 'green',  label: 'উপলব্ধ',             dot: true },
    Occupied:              { variant: 'rose',   label: 'দখলকৃত',            dot: true },
    Free:                  { variant: 'sky',    label: 'ফ্রি'                         },
    Premium:               { variant: 'purple', label: 'প্রিমিয়াম'                   },
    Normal:                { variant: 'green',  label: 'স্বাভাবিক'                    },
    Abnormal:              { variant: 'red',    label: 'অস্বাভাবিক'                   },
    'Follow-up required':  { variant: 'amber',  label: 'ফলো-আপ প্রয়োজন'             },
    admin:                 { variant: 'purple', label: 'অ্যাডমিন'                     },
    owner:                 { variant: 'blue',   label: 'মালিক'                        },
    manager:               { variant: 'teal',   label: 'ম্যানেজার'                    },
    pathologist:           { variant: 'amber',  label: 'প্যাথলজিস্ট'                  },
    patient:               { variant: 'gray',   label: 'রোগী'                         },
  }
  const cfg = config[status] ?? { variant: 'gray' as const, label: status }
  return (
    <Badge variant={cfg.variant} dot={cfg.dot}>
      {cfg.label}
    </Badge>
  )
}
