"use client"

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HeartPulse, ChevronRight } from 'lucide-react'

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { login } = useAuthStore()

  const registerSchema = useMemo(() => z.object({
    name:            z.string().min(2, t('auth.nameMinLength')),
    phone:           z.string().min(11, t('auth.validPhone')).max(14, t('auth.validPhone')),
    password:        z.string().min(6, t('auth.passwordMinLength')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('settings.passwordMismatch'),
    path: ['confirmPassword'],
  }), [t])

  type RegisterForm = z.output<typeof registerSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(registerSchema) as any,
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) =>
      api.auth.register({
        name: data.name,
        phone: data.phone,
        password: data.password,
      }),
    onSuccess: ({ user, token }) => { login(user, token); router.push('/patient') },
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl mb-4 shadow-lg shadow-green-200">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('auth.registerTitle')}</h1>
          <p className="text-slate-500 mt-1.5 text-sm">{t('auth.registerSubtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form method="post" onSubmit={handleSubmit((d) => registerMutation.mutate(d))} noValidate className="space-y-4">
            <Input label={t('settings.fullName')} placeholder={t('auth.namePlaceholder')} error={errors.name?.message} {...register('name')} />
            <Input label={t('auth.phone')} placeholder={t('auth.phonePlaceholder')} error={errors.phone?.message} {...register('phone')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('auth.password')} type="password" placeholder={t('auth.createPasswordPlaceholder')} error={errors.password?.message} {...register('password')} />
              <Input label={t('auth.confirmPassword')} type="password" placeholder={t('auth.confirmPasswordPlaceholder')} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t('auth.demographicsHint')}
            </p>

            {registerMutation.isError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : t('auth.registerFailed')}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={registerMutation.isPending}>
              {t('auth.register')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
