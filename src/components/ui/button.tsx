"use client"

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'soft'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-b from-green-500 to-green-600 text-white shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-[0.98]',
  secondary:
    'bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-sm hover:from-slate-800 hover:to-slate-900 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2',
  danger:
    'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm hover:from-red-600 hover:to-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-200',
  outline:
    'bg-white text-green-700 border-2 border-green-600 hover:bg-green-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm',
  soft: 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-2 focus:ring-green-200',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1.5 rounded-md',
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-base gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
