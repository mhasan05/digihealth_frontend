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
  HeartPulse, Shield, Building2, ChevronRight,
  Eye, EyeOff, Loader2, Users,
} from 'lucide-react'
import { derivePortals, PORTAL_ROUTES } from '@/types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'This field is required'),
  password:   z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})
type LoginForm = z.infer<typeof loginSchema>

const demoRoles = [
  { role: 'admin',     label: 'Admin',       color: 'bg-violet-600 hover:bg-violet-700', icon: '🛡️' },
  { role: 'owner',     label: 'Owner',        color: 'bg-blue-600   hover:bg-blue-700',   icon: '🏥' },
  { role: 'manager',   label: 'Manager',      color: 'bg-teal-600   hover:bg-teal-700',   icon: '📋' },
  { role: 'pathologist', label: 'Pathologist', color: 'bg-amber-600 hover:bg-amber-700',  icon: '🔬' },
  { role: 'patient',   label: 'Patient',      color: 'bg-green-600   hover:bg-green-700',    icon: '👤' },
  { role: 'multiRole', label: 'Multi-Role',   color: 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700', icon: '✨' },
]

const features = [
  { icon: HeartPulse, text: 'Portable Health ID — accepted at any connected hospital' },
  { icon: Shield,     text: 'Full privacy control — see who accessed your records' },
  { icon: Building2,  text: 'Multi-hospital connected network' },
  { icon: Users,      text: 'Multi-role access — switch portals without re-login' },
]

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [error,   setError]   = useState('')
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
    onError: (err: Error) => setError(err.message || 'Login failed'),
  })

  const demoMutation = useMutation({
    mutationFn: (role: string) => api.auth.loginAsRole(role),
    onSuccess: ({ user, token }) => {
      login(user, token)
      const portals = derivePortals(user.roles)
      router.push(PORTAL_ROUTES[portals[0]])
    },
  })

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0c2e18 0%, #133d22 45%, #1a5c35 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-green-500/10 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[240px] h-[240px] rounded-full bg-emerald-400/8 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-green-600/5 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-900/40">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight">DigiHealth</p>
            <p className="text-green-300/60 text-xs">CMS Platform</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <p className="text-green-300/80 text-sm font-semibold tracking-widest uppercase mb-4">
            Bangladesh's Leading
          </p>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Digital Health<br />
            <span className="text-green-400">Management</span><br />
            Platform
          </h2>
          <p className="text-green-100/60 text-sm leading-relaxed mb-8 max-w-xs">
            Hospital management, patient tracking, lab workflow, and multi-role access — all in one platform.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-green-100/70 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            {[['50+', 'Hospitals'], ['10K+', 'Patients'], ['5', 'Roles']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <p className="text-white font-bold text-lg leading-tight">{val}</p>
                <p className="text-green-300/50 text-[10px]">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-900">DigiHealth CMS</p>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit((d) => { setError(''); loginMutation.mutate(d) })} noValidate className="space-y-4">
            <Input
              label="Phone / Health ID"
              placeholder="017XXXXXXXX or DH-190000000001"
              hint="Enter your phone number or Health ID"
              error={errors.identifier?.message}
              {...register('identifier')}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loginMutation.isPending}>
              Sign In
              <ChevronRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            No account?{' '}
            <Link href="/register" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
              Register
            </Link>
          </p>

          {/* Demo login */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-1">
              Demo Login
            </p>
            <p className="text-[10px] text-slate-400 text-center mb-3">
              ✨ Multi-Role demo shows the portal switcher
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demoRoles.map(({ role, label, color, icon }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => demoMutation.mutate(role)}
                  disabled={demoMutation.isPending}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-white text-[11px] font-semibold transition-all disabled:opacity-50 hover:scale-105 hover:shadow-md gap-1.5 ${color}`}
                >
                  {demoMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <span className="text-lg leading-none">{icon}</span>
                  }
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
