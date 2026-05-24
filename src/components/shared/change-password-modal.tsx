"use client"

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const schema = z
  .object({
    current_password: z.string().min(1, 'বর্তমান পাসওয়ার্ড দিন'),
    new_password: z.string().min(4, 'কমপক্ষে ৪ অক্ষর'),
    confirm_password: z.string().min(1, 'পাসওয়ার্ড নিশ্চিত করুন'),
  })
  .refine(d => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'পাসওয়ার্ড মিলছে না',
  })

type Form = z.infer<typeof schema>

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (d: Form) =>
      api.auth.changePassword({ current_password: d.current_password, new_password: d.new_password }),
    onSuccess: (res) => {
      setSuccessMsg(res.detail || 'পাসওয়ার্ড পরিবর্তন সফল হয়েছে।')
      setErrorMsg(null)
      reset()
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      setSuccessMsg(null)
    },
  })

  const close = () => {
    reset()
    setErrorMsg(null)
    setSuccessMsg(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="পাসওয়ার্ড পরিবর্তন" size="sm">
      <form onSubmit={handleSubmit(d => { setErrorMsg(null); setSuccessMsg(null); mutation.mutate(d) })} className="space-y-4">
        <Input
          label="বর্তমান পাসওয়ার্ড"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register('current_password')}
        />
        <Input
          label="নতুন পাসওয়ার্ড"
          type="password"
          autoComplete="new-password"
          error={errors.new_password?.message}
          {...register('new_password')}
        />
        <Input
          label="নতুন পাসওয়ার্ড নিশ্চিত করুন"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />

        {errorMsg && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={close}>বন্ধ করুন</Button>
          <Button type="submit" loading={mutation.isPending}>পরিবর্তন করুন</Button>
        </div>
      </form>
    </Modal>
  )
}
