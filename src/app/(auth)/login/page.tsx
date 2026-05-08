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
import {
  HeartPulse, ShieldCheck, Building2, ChevronRight,
  Eye, EyeOff, Users, FlaskConical, BedDouble,
} from 'lucide-react'
import { derivePortals, PORTAL_ROUTES } from '@/types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'এই ঘরটি পূরণ করতে হবে'),
  password:   z.string().min(1, 'পাসওয়ার্ড দিন'),
  rememberMe: z.boolean().optional(),
})
type LoginForm = z.infer<typeof loginSchema>

const features = [
  { icon: HeartPulse,   title: 'পোর্টেবল হেলথ আইডি',     text: 'যেকোনো সংযুক্ত হাসপাতালে ব্যবহারযোগ্য' },
  { icon: ShieldCheck,  title: 'সম্পূর্ণ গোপনীয়তা',        text: 'কে কখন রেকর্ড দেখেছে — সব দেখুন' },
  { icon: Building2,    title: 'মাল্টি-হাসপাতাল',           text: 'এক অ্যাকাউন্টে একাধিক হাসপাতাল' },
  { icon: Users,        title: 'মাল্টি-রোল অ্যাক্সেস',     text: 'এক লগইনে সব পোর্টাল' },
  { icon: FlaskConical, title: 'ল্যাব ওয়ার্কফ্লো',          text: 'অর্ডার থেকে রিপোর্ট — এক জায়গায়' },
  { icon: BedDouble,    title: 'ভর্তি ব্যবস্থাপনা',         text: 'বেড, নার্স ও বিল রিয়েল-টাইম' },
]

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
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* ── Left Panel (desktop only) ────────────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #052e16 0%, #0f3a21 35%, #14532d 70%, #15803d 100%)' }}
      >
        {/* Decorative blurred orbs */}
        <div className="absolute -top-40 -right-32 w-[420px] h-[420px] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-32 w-[380px] h-[380px] rounded-full bg-green-400/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[280px] h-[280px] rounded-full bg-teal-300/5 blur-3xl pointer-events-none" />

        {/* Subtle dotted grid */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content stack */}
        <div className="relative z-10 flex flex-col justify-between h-full px-10 xl:px-16 py-10 xl:py-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl shadow-black/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight tracking-tight">DigiHealth</p>
              <p className="text-emerald-200/70 text-[11px] font-medium">ডিজিটাল স্বাস্থ্য প্ল্যাটফর্ম</p>
            </div>
          </div>

          {/* Hero */}
          <div className="max-w-md py-10">
            <p className="text-emerald-300/80 text-[11px] font-bold tracking-[0.2em] uppercase mb-4">
              বাংলাদেশের শীর্ষ স্বাস্থ্য নেটওয়ার্ক
            </p>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
              স্বাস্থ্যসেবা এখন<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-100">
                আপনার হাতের মুঠোয়
              </span>
            </h2>
            <p className="text-emerald-50/70 text-[15px] leading-relaxed">
              হাসপাতাল ব্যবস্থাপনা, রোগী রেকর্ড, ল্যাব ওয়ার্কফ্লো ও মাল্টি-রোল অ্যাক্সেস —
              সবকিছু একই প্ল্যাটফর্মে, বাংলায়।
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 max-w-2xl">
            {features.map(({ icon: Icon, title, text }, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                  <Icon className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-[13px] leading-tight">{title}</p>
                  <p className="text-emerald-100/55 text-[11px] leading-snug mt-1">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats footer */}
          <div className="flex items-center gap-6 pt-8">
            {[
              { v: '৫০+',     l: 'হাসপাতাল' },
              { v: '১০ হাজার+', l: 'রোগী'      },
              { v: '৫',        l: 'রোল'        },
            ].map(({ v, l }) => (
              <div key={l}>
                <p className="text-white font-extrabold text-2xl leading-none tracking-tight">{v}</p>
                <p className="text-emerald-200/60 text-[11px] mt-1.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-[400px]">
          {/* Mobile logo + tagline */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-md shadow-green-200">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">DigiHealth</p>
              <p className="text-xs text-slate-500 mt-0.5">ডিজিটাল স্বাস্থ্য প্ল্যাটফর্ম</p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">আবার স্বাগতম</h1>
            <p className="text-slate-500 text-sm mt-1.5">আপনার অ্যাকাউন্টে লগইন করুন</p>
          </div>

          <form onSubmit={handleSubmit((d) => { setError(''); loginMutation.mutate(d) })} noValidate className="space-y-4">
            <Input
              label="ফোন নম্বর / হেলথ আইডি"
              placeholder="০১৭XXXXXXXX অথবা DH-190000000001"
              hint="আপনার ফোন নম্বর বা হেলথ আইডি দিন"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 focus:ring-offset-0"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-slate-600">আমাকে মনে রাখুন</span>
              </label>
            </div>

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
            <div className="relative flex justify-center"><span className="bg-slate-50 px-3 text-xs text-slate-400">অথবা</span></div>
          </div>

          <p className="text-center text-sm text-slate-600">
            অ্যাকাউন্ট নেই?{' '}
            <Link href="/register" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
              নিবন্ধন করুন
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
