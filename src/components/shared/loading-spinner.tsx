import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }

export function LoadingSpinner({ className, size = 'md', text = 'লোড হচ্ছে...' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
        <Loader2 className={cn('animate-spin text-green-600 relative', sizeClasses[size])} />
      </div>
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping scale-150" />
          <Loader2 className="w-10 h-10 animate-spin text-green-600 relative" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">লোড হচ্ছে...</p>
      </div>
    </div>
  )
}
