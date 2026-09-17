"use client"

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, User, KeyRound, Check } from 'lucide-react'
import { PATIENT_CONDITIONS, type PatientCondition } from '@/types'

type ProfileForm = {
  name: string; email?: string; date_of_birth: string
  gender: 'Male' | 'Female' | 'Other'; blood_group?: string; address?: string; nid?: string
}
type PasswordForm = { current_password: string; new_password: string; confirm_password: string }

// ── Modal shell ──────────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void }

export function SettingsModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')} size="md">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={User} label={t('settings.profileTab')} />
        <TabButton active={tab === 'password'} onClick={() => setTab('password')} icon={KeyRound} label={t('auth.password')} />
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const updateUser = useAuthStore(s => s.updateUser)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [conditions, setConditions] = useState<PatientCondition[]>([])

  const profileSchema = useMemo(() => z.object({
    name:          z.string().min(2, t('settings.nameRequired')),
    email:         z.string().email(t('settings.validEmail')).optional().or(z.literal('')),
    date_of_birth: z.string().min(1, t('settings.dobRequired')),
    gender:        z.enum(['Male', 'Female', 'Other'], { message: t('settings.selectGender') }),
    blood_group:   z.string().optional(),
    address:       z.string().optional(),
    nid:           z.string().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, t('settings.validNid')).optional().or(z.literal('')),
  }), [t])

  const { data: me, isLoading } = useQuery({
    queryKey: ['patient', 'me'],
    queryFn:  () => api.patient.getDashboard(''),  // patientId is ignored by backend
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name: '', email: '', date_of_birth: '',
      gender: 'Other', blood_group: '', address: '', nid: '',
    },
  })

  useEffect(() => {
    if (me) {
      reset({
        name:          me.name ?? '',
        email:         '',
        date_of_birth: me.date_of_birth ?? '',
        gender:        (me.gender ?? 'Other') as 'Male' | 'Female' | 'Other',
        blood_group:   me.blood_group && me.blood_group !== 'Unknown' ? me.blood_group : '',
        address:       me.address ?? '',
        nid:           me.nid ?? '',
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
        name:          data.name,
        email:         data.email || undefined,
        date_of_birth: data.date_of_birth,
        gender:        data.gender,
        blood_group:   data.blood_group || '',
        address:       data.address || '',
        nid:           data.nid || '',
        conditions,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient'] })
      // The header reads name/email straight from the persisted auth store,
      // which a query invalidation above doesn't touch — patch it directly so
      // it doesn't keep showing the pre-edit name until the next login.
      updateUser({ name: variables.name, email: variables.email || undefined })
      setSuccessMsg(t('settings.profileUpdated'))
      setErrorMsg(null)
    },
    onError: (err: Error) => { setErrorMsg(err.message); setSuccessMsg(null) },
  })

  if (isLoading) {
    return <p className="text-center text-sm text-slate-400 py-10">{t('common.loading')}</p>
  }

  return (
    <form
      onSubmit={handleSubmit(d => { setErrorMsg(null); setSuccessMsg(null); saveMutation.mutate(d) })}
      className="space-y-4"
    >
      <Input label={t('settings.fullName')} error={errors.name?.message} {...register('name')} />
      <Input label={t('settings.emailOptional')} type="email" error={errors.email?.message} {...register('email')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label={t('settings.dateOfBirth')} type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
        <Select
          label={t('patient.gender')}
          error={errors.gender?.message}
          options={[
            { value: 'Male',   label: t('patient.male')   },
            { value: 'Female', label: t('patient.female') },
            { value: 'Other',  label: t('patient.other')  },
          ]}
          {...register('gender')}
        />
        <Select
          label={t('patient.bloodGroup')}
          error={errors.blood_group?.message}
          options={[
            { value: '', label: t('settings.unknownBloodGroup') },
            ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
          ]}
          {...register('blood_group')}
        />
        <Input label={t('common.address')} error={errors.address?.message} {...register('address')} />
        <Input label={t('settings.nidOptional')} placeholder={t('settings.nidPlaceholder')} error={errors.nid?.message} {...register('nid')} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('settings.chronicConditionsOptional')}</label>
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
                {t(c.labelKey)}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-snug">
          {t('settings.chronicConditionsHint')}
        </p>
      </div>

      {me?.phone && (
        <p className="text-xs text-slate-400">
          {t('common.phone')}: <span className="font-mono text-slate-600">{me.phone}</span> · {t('settings.phoneChangeHint')}
        </p>
      )}

      <MessageBox errorMsg={errorMsg} successMsg={successMsg} />

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
        <Button type="submit" loading={saveMutation.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}

// ── Password section ─────────────────────────────────────────────────────────
function PasswordSection({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const passwordSchema = useMemo(() => z
    .object({
      current_password: z.string().min(1, t('settings.currentPasswordRequired')),
      new_password:     z.string().min(4, t('settings.minChars4')),
      confirm_password: z.string().min(1, t('settings.confirmPasswordRequired')),
    })
    .refine(d => d.new_password === d.confirm_password, {
      path: ['confirm_password'],
      message: t('settings.passwordMismatch'),
    }), [t])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const mutation = useMutation({
    mutationFn: (d: PasswordForm) =>
      api.auth.changePassword({ current_password: d.current_password, new_password: d.new_password }),
    onSuccess: (res) => {
      setSuccessMsg(res.detail || t('settings.passwordChanged'))
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
      <Input label={t('settings.currentPassword')} type="password" autoComplete="current-password"
        error={errors.current_password?.message} {...register('current_password')} />
      <Input label={t('settings.newPassword')} type="password" autoComplete="new-password"
        error={errors.new_password?.message} {...register('new_password')} />
      <Input label={t('settings.confirmNewPassword')} type="password" autoComplete="new-password"
        error={errors.confirm_password?.message} {...register('confirm_password')} />

      <MessageBox errorMsg={errorMsg} successMsg={successMsg} />

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
        <Button type="submit" loading={mutation.isPending}>{t('settings.changePasswordAction')}</Button>
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
