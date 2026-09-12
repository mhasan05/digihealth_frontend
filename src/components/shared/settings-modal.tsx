"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, User, KeyRound, Check } from 'lucide-react'
import { PATIENT_CONDITIONS, type PatientCondition } from '@/types'

// ── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name:        z.string().min(2, 'নাম দিন'),
  email:       z.string().email('সঠিক ইমেইল দিন').optional().or(z.literal('')),
  age:         z.coerce.number({ message: 'বয়স দিন' }).int().min(0).max(150),
  gender:      z.enum(['Male', 'Female', 'Other'], { message: 'লিঙ্গ নির্বাচন করুন' }),
  blood_group: z.string().optional(),
  address:     z.string().optional(),
  nid:         z.string().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, 'সঠিক NID নম্বর দিন (১০, ১৩ বা ১৭ ডিজিট)').optional().or(z.literal('')),
})
type ProfileForm = z.output<typeof profileSchema>

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'বর্তমান পাসওয়ার্ড দিন'),
    new_password:     z.string().min(4, 'কমপক্ষে ৪ অক্ষর'),
    confirm_password: z.string().min(1, 'পাসওয়ার্ড নিশ্চিত করুন'),
  })
  .refine(d => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'পাসওয়ার্ড মিলছে না',
  })
type PasswordForm = z.infer<typeof passwordSchema>

// ── Modal shell ──────────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void }

export function SettingsModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="সেটিংস" size="md">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={User} label="প্রোফাইল" />
        <TabButton active={tab === 'password'} onClick={() => setTab('password')} icon={KeyRound} label="পাসওয়ার্ড" />
      </div>
      {tab === 'profile' ? <ProfileSection onClose={onClose} /> : <PasswordSection onClose={onClose} />}
    </Modal>
  )
}

function TabButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

// ── Profile section ──────────────────────────────────────────────────────────
function ProfileSection({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [conditions, setConditions] = useState<PatientCondition[]>([])

  const { data: me, isLoading } = useQuery({
    queryKey: ['patient', 'me'],
    queryFn:  () => api.patient.getDashboard(''),  // patientId is ignored by backend
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name: '', email: '', age: 0,
      gender: 'Other', blood_group: '', address: '', nid: '',
    },
  })

  useEffect(() => {
    if (me) {
      reset({
        name:        me.name ?? '',
        email:       '',
        age:         me.age ?? 0,
        gender:      (me.gender ?? 'Other') as 'Male' | 'Female' | 'Other',
        blood_group: me.blood_group && me.blood_group !== 'Unknown' ? me.blood_group : '',
        address:     me.address ?? '',
        nid:         me.nid ?? '',
      })
      setConditions((me.conditions ?? []) as PatientCondition[])
    }
  }, [me, reset])

  const toggleCondition = (c: PatientCondition) => {
    setConditions(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c],
    )
  }

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.patient.updateMyProfile({
        name:        data.name,
        email:       data.email || undefined,
        age:         data.age,
        gender:      data.gender,
        blood_group: data.blood_group || '',
        address:     data.address || '',
        nid:         data.nid || '',
        conditions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient'] })
      setSuccessMsg('প্রোফাইল আপডেট হয়েছে।')
      setErrorMsg(null)
    },
    onError: (err: Error) => { setErrorMsg(err.message); setSuccessMsg(null) },
  })

  if (isLoading) {
    return <p className="text-center text-sm text-slate-400 py-10">লোড হচ্ছে...</p>
  }

  return (
    <form
      onSubmit={handleSubmit(d => { setErrorMsg(null); setSuccessMsg(null); saveMutation.mutate(d) })}
      className="space-y-4"
    >
      <Input label="পূর্ণ নাম" error={errors.name?.message} {...register('name')} />
      <Input label="ইমেইল (ঐচ্ছিক)" type="email" error={errors.email?.message} {...register('email')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="বয়স" type="number" error={errors.age?.message} {...register('age')} />
        <Select
          label="লিঙ্গ"
          error={errors.gender?.message}
          options={[
            { value: 'Male',   label: 'পুরুষ'    },
            { value: 'Female', label: 'মহিলা'    },
            { value: 'Other',  label: 'অন্যান্য' },
          ]}
          {...register('gender')}
        />
        <Select
          label="রক্তের গ্রুপ (ঐচ্ছিক)"
          error={errors.blood_group?.message}
          options={[
            { value: '', label: 'অজানা' },
            ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
          ]}
          {...register('blood_group')}
        />
        <Input label="ঠিকানা" error={errors.address?.message} {...register('address')} />
        <Input label="NID নম্বর (ঐচ্ছিক)" placeholder="১০, ১৩ বা ১৭ ডিজিট" error={errors.nid?.message} {...register('nid')} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">দীর্ঘমেয়াদী রোগ (যদি থাকে)</label>
        <div className="flex flex-wrap gap-2">
          {PATIENT_CONDITIONS.map(c => {
            const active = conditions.includes(c.value)
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCondition(c.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'bg-green-50 text-green-700 border-green-300 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="w-3 h-3" />}
                {c.label}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-snug">
          ডাক্তার আপনাকে দেখার সময় এই তথ্য দেখতে পাবেন। যেকোনো সময় পরিবর্তন করতে পারেন।
        </p>
      </div>

      {me?.phone && (
        <p className="text-xs text-slate-400">
          ফোন: <span className="font-mono text-slate-600">{me.phone}</span> · ফোন পরিবর্তন করতে অ্যাডমিনের সাথে যোগাযোগ করুন
        </p>
      )}

      <MessageBox errorMsg={errorMsg} successMsg={successMsg} />

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>বন্ধ করুন</Button>
        <Button type="submit" loading={saveMutation.isPending}>সংরক্ষণ করুন</Button>
      </div>
    </form>
  )
}

// ── Password section ─────────────────────────────────────────────────────────
function PasswordSection({ onClose }: { onClose: () => void }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const mutation = useMutation({
    mutationFn: (d: PasswordForm) =>
      api.auth.changePassword({ current_password: d.current_password, new_password: d.new_password }),
    onSuccess: (res) => {
      setSuccessMsg(res.detail || 'পাসওয়ার্ড পরিবর্তন সফল হয়েছে।')
      setErrorMsg(null)
      reset()
    },
    onError: (err: Error) => { setErrorMsg(err.message); setSuccessMsg(null) },
  })

  return (
    <form
      onSubmit={handleSubmit(d => { setErrorMsg(null); setSuccessMsg(null); mutation.mutate(d) })}
      className="space-y-4"
    >
      <Input label="বর্তমান পাসওয়ার্ড" type="password" autoComplete="current-password"
        error={errors.current_password?.message} {...register('current_password')} />
      <Input label="নতুন পাসওয়ার্ড" type="password" autoComplete="new-password"
        error={errors.new_password?.message} {...register('new_password')} />
      <Input label="নতুন পাসওয়ার্ড নিশ্চিত করুন" type="password" autoComplete="new-password"
        error={errors.confirm_password?.message} {...register('confirm_password')} />

      <MessageBox errorMsg={errorMsg} successMsg={successMsg} />

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>বন্ধ করুন</Button>
        <Button type="submit" loading={mutation.isPending}>পরিবর্তন করুন</Button>
      </div>
    </form>
  )
}

function MessageBox({ errorMsg, successMsg }: { errorMsg: string | null; successMsg: string | null }) {
  if (errorMsg) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
      </div>
    )
  }
  if (successMsg) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{successMsg}</span>
      </div>
    )
  }
  return null
}
