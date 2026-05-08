"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { HeartPulse, ChevronRight } from 'lucide-react'

const registerSchema = z.object({
  name:            z.string().min(2, 'নাম কমপক্ষে ২ অক্ষর হতে হবে'),
  phone:           z.string().min(11, 'সঠিক ফোন নম্বর দিন').max(14, 'সঠিক ফোন নম্বর দিন'),
  password:        z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে'),
  confirmPassword: z.string(),
  age:             z.coerce.number().min(1, 'বয়স দিন').max(150, 'সঠিক বয়স দিন'),
  gender:          z.enum(['Male', 'Female', 'Other'], { message: 'লিঙ্গ নির্বাচন করুন' }),
  blood_group:     z.string().optional(),
  address:         z.string().min(5, 'ঠিকানা কমপক্ষে ৫ অক্ষর হতে হবে'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'পাসওয়ার্ড মিলছে না',
  path: ['confirmPassword'],
})

type RegisterForm = z.output<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(registerSchema) as any,
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) =>
      api.auth.register({
        name: data.name, phone: data.phone, password: data.password,
        age: data.age, gender: data.gender, blood_group: data.blood_group ?? '', address: data.address,
      }),
    onSuccess: ({ user, token }) => { login(user, token); router.push('/patient') },
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl mb-4 shadow-lg shadow-green-200">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">রোগী নিবন্ধন</h1>
          <p className="text-slate-500 mt-1.5 text-sm">আপনার DigiHealth অ্যাকাউন্ট তৈরি করুন</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="পূর্ণ নাম" placeholder="আপনার নাম লিখুন" error={errors.name?.message} {...register('name')} />
              </div>
              <Input label="ফোন নম্বর" placeholder="০১৭XXXXXXXX" error={errors.phone?.message} {...register('phone')} />
              <Input label="বয়স" type="number" placeholder="বয়স লিখুন" error={errors.age?.message} {...register('age')} />
              <Select
                label="লিঙ্গ"
                error={errors.gender?.message}
                placeholder="লিঙ্গ নির্বাচন করুন"
                options={[
                  { value: 'Male', label: 'পুরুষ' },
                  { value: 'Female', label: 'মহিলা' },
                  { value: 'Other', label: 'অন্যান্য' },
                ]}
                {...register('gender')}
              />
              <Select
                label="রক্তের গ্রুপ (ঐচ্ছিক)"
                error={errors.blood_group?.message}
                options={[
                  { value: '', label: 'অজানা' },
                  ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v })),
                ]}
                {...register('blood_group')}
              />
              <div className="sm:col-span-2">
                <Input label="ঠিকানা" placeholder="আপনার ঠিকানা লিখুন" error={errors.address?.message} {...register('address')} />
              </div>
              <Input label="পাসওয়ার্ড" type="password" placeholder="পাসওয়ার্ড লিখুন" error={errors.password?.message} {...register('password')} />
              <Input label="পাসওয়ার্ড নিশ্চিত করুন" type="password" placeholder="পুনরায় লিখুন" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            </div>

            {registerMutation.isError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                নিবন্ধন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={registerMutation.isPending}>
              নিবন্ধন করুন
              <ChevronRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
              লগইন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
