"use client"

import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { Modal } from './modal'
import { Button } from './button'

type Tone = 'danger' | 'primary' | 'warning'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
  isLoading?: boolean
}

const toneStyles: Record<Tone, { iconBg: string; iconColor: string; Icon: React.ElementType; buttonVariant: 'danger' | 'primary' | 'secondary'; defaultConfirm: string }> = {
  danger: {
    iconBg:        'bg-red-100',
    iconColor:     'text-red-600',
    Icon:          AlertTriangle,
    buttonVariant: 'danger',
    defaultConfirm: 'মুছুন',
  },
  primary: {
    iconBg:        'bg-green-100',
    iconColor:     'text-green-600',
    Icon:          CheckCircle2,
    buttonVariant: 'primary',
    defaultConfirm: 'হ্যাঁ',
  },
  warning: {
    iconBg:        'bg-amber-100',
    iconColor:     'text-amber-600',
    Icon:          HelpCircle,
    buttonVariant: 'secondary',
    defaultConfirm: 'হ্যাঁ',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'বাতিল',
  tone = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const t = toneStyles[tone]
  const { Icon } = t
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${t.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${t.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button variant={t.buttonVariant} onClick={onConfirm} loading={isLoading}>
              {confirmLabel ?? t.defaultConfirm}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
