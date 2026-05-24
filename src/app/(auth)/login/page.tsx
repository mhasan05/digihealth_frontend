"use client"

import { useState } from 'react'
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
import { HeartPulse, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { derivePortals, PORTAL_ROUTES } from '@/types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'এই ঘরটি পূরণ করতে হবে'),
  password:   z.string().min(1, 'পাসওয়ার্ড দিন'),
  rememberMe: z.boolean().optional(),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const router = useRouter()
  const { login } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => {
      const method = data.identifier.toUpperCase().startsWith('DH-') ? 'health_id' : 'phone'
      return api.auth.login({ identifier: data.identifier, password: data.password, method })
    },
    onSuccess: ({ user, token }) => {
      login(user, token)
      const portals = derivePortals(user.roles)
      router.push(PORTAL_ROUTES[portals[0]])
    },
    onError: (err: Error) => setError(err.message || 'লগইন ব্যর্থ হয়েছে'),
  })

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-md shadow-green-200/60">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">DigiHealth</p>
            <p className="text-xs text-slate-500 mt-0.5">ডিজিটাল স্বাস্থ্য প্ল্যাটফর্ম</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">আবার স্বাগতম</h1>
            <p className="text-slate-500 text-sm mt-1">আপনার অ্যাকাউন্টে লগইন করুন</p>
          </div>

          <form
            onSubmit={handleSubmit((d) => { setError(''); loginMutation.mutate(d) })}
            noValidate
            className="space-y-4"
          >
            <Input
              label="ফোন নম্বর / হেলথ আইডি"
              placeholder="০১৭XXXXXXXX অথবা DH-190000000001"
              error={errors.identifier?.message}
              autoComplete="username"
              {...register('identifier')}
            />
            <div className="relative">
              <Input
                label="পাসওয়ার্ড"
                type={showPass ? 'text' : 'password'}
                placeholder="আপনার পাসওয়ার্ড দিন"
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="পাসওয়ার্ড দেখুন/লুকান"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 focus:ring-offset-0"
                {...register('rememberMe')}
              />
              <span className="text-sm text-slate-600">আমাকে মনে রাখুন</span>
            </label>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loginMutation.isPending}>
              লগইন করুন
              <ChevronRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">অথবা</span></div>
          </div>

          <p className="text-center text-sm text-slate-600">
            অ্যাকাউন্ট নেই?{' '}
            <Link href="/register" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
              নিবন্ধন করুন
            </Link>
          </p>
        </div>

        {/* Footer mark */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          © {new Date().getFullYear()} DigiHealth · বাংলাদেশ
        </p>
      </div>
    </div>
  )
}
