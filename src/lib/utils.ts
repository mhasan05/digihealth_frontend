import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import i18n from '@/i18n/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Read at call time (not cached) so formatting follows the active language
// toggle without every caller needing to pass it in explicitly — components
// that display formatted dates/currency already re-render on language change
// via useTranslation(), which is when these get called again.
function currentLocale(): string {
  return i18n.language?.startsWith('bn') ? 'bn-BD' : 'en-BD'
}

export function formatCurrency(amount: number): string {
  return `৳ ${amount.toLocaleString(currentLocale())}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(currentLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(currentLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
