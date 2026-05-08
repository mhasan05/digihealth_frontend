"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { NurseSearch } from '@/components/shared/nurse-search'
import { DoctorSearch } from '@/components/shared/doctor-search'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { BedDouble, Eye, User, Stethoscope, Calendar, Clock, Banknote, Plus, Search, UserPlus, X, Pencil, LogOut } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Admission, Appointment, Patient, Nurse, Bed, Doctor } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAdmitted(admittedAt: string, dischargedAt?: string): number {
  const from = new Date(admittedAt).getTime()
  const to   = dischargedAt ? new Date(dischargedAt).getTime() : Date.now()
  return Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)))
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const directAdmitSchema = z.object({
  phone:        z.string().min(11, 'ফোন নম্বর দিন'),
  bed_id:       z.string().min(1, 'বেড নির্বাচন করুন'),
  nurse_id:     z.string().optional(),
  doctor_id:    z.string().optional(),
  reason:       z.string().optional(),
  // New-user fields — optional unless creating
  name:         z.string().optional(),
  age:          z.string().optional(),
  gender:       z.enum(['Male', 'Female', 'Other']).optional(),
  blood_group:  z.string().optional(),
})
type DirectAdmitForm = z.infer<typeof directAdmitSchema>

const editAdmissionSchema = z.object({
  name:        z.string().min(2, 'নাম দিন'),
  age:         z.string().optional(),
  gender:      z.enum(['Male', 'Female', 'Other']),
  blood_group: z.string().optional(),
  address:     z.string().optional(),
  bed_id:      z.string().min(1, 'বেড নির্বাচন করুন'),
  nurse_id:    z.string().optional(),
  doctor_id:   z.string().optional(),
  reason:      z.string().optional(),
})
type EditAdmissionForm = z.infer<typeof editAdmissionSchema>

// ── Detail / Edit Modal ──────────────────────────────────────────────────────
function AdmissionDetailModal({
  admission,
  appointment,
  beds,
  nurses,
  doctors,
  onClose,
  onDischarge,
}: {
  admission: Admission | null
  appointment: Appointment | undefined
  beds: Bed[]
  nurses: Nurse[]
  doctors: Doctor[]
  onClose: () => void
  onDischarge: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'

  const [editing, setEditing] = useState(false)
  const [confirmDischarge, setConfirmDischarge] = useState(false)
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<EditAdmissionForm>({
    resolver: zodResolver(editAdmissionSchema),
    defaultValues: { gender: 'Male' },
  })

  // Reset form + state when admission changes / modal opens
  useEffect(() => {
    if (!admission) {
      setEditing(false)
      setSelectedNurse(null)
      setSelectedDoctor(null)
      setErrorMsg(null)
      return
    }
    form.reset({
      name:        admission.patient_name,
      age:         admission.patient_age != null ? String(admission.patient_age) : '',
      gender:      (admission.patient_gender as 'Male' | 'Female' | 'Other') ?? 'Other',
      blood_group: admission.blood_group ?? '',
      address:     admission.address ?? '',
      bed_id:      admission.bed_id,
      nurse_id:    admission.nurse_id ?? '',
      doctor_id:   admission.doctor_id ?? '',
      reason:      admission.reason ?? appointment?.reason ?? '',
    })
    if (admission.nurse_id) {
      setSelectedNurse({
        id:       admission.nurse_id,
        hospital_id: hospitalId,
        name:     admission.nurse_name,
        phone:    '',
        ward:     admission.ward,
        status:   'Active',
        created_at: admission.admitted_at,
      })
    } else {
      setSelectedNurse(null)
    }
    if (admission.doctor_id) {
      setSelectedDoctor(doctors.find(d => d.id === admission.doctor_id) ?? {
        id:       admission.doctor_id,
        hospital_id: hospitalId,
        name:     admission.doctor_name ?? '',
        phone:    '',
        specialization: '',
        schedule: '',
        status:   'Active',
        created_at: admission.admitted_at,
      })
    } else {
      setSelectedDoctor(null)
    }
  }, [admission, appointment, hospitalId, doctors, form])

  const saveMutation = useMutation({
    mutationFn: async (data: EditAdmissionForm) => {
      if (!admission) throw new Error('No admission')
      // Update patient demographics
      await api.manager.updatePatient(admission.patient_id, {
        name:        data.name,
        age:         data.age ? Number(data.age) : 0,
        gender:      data.gender,
        blood_group: data.blood_group || undefined,
        address:     data.address || '',
      })
      // Update admission (bed + nurse + doctor + reason)
      await api.manager.updateAdmission(admission.id, {
        bed_id:    data.bed_id,
        nurse_id:  data.nurse_id ?? '',
        doctor_id: data.doctor_id ?? '',
        reason:    data.reason ?? '',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['available-beds', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['available-nurses', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', hospitalId] })
      setEditing(false)
      onClose()
    },
    onError: (err: Error) => setErrorMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে'),
  })

  if (!admission) return null

  const isActive = !admission.discharged_at
  const days     = daysAdmitted(admission.admitted_at, admission.discharged_at)
  const total    = days * admission.bed_price_snapshot

  // Available beds plus the currently-occupied bed (so it stays selectable)
  const bedOptions = [
    ...beds.map(b => ({ value: b.id, label: `বেড ${b.number} — ${b.ward} (${b.type})` })),
    ...(admission.bed_id && !beds.some(b => b.id === admission.bed_id)
      ? [{ value: admission.bed_id, label: `বেড ${admission.bed_number} — ${admission.ward} (বর্তমান)` }]
      : []),
  ]

  // Available nurses plus the currently-assigned nurse (so they stay selectable)
  const nurseOptions = admission.nurse_id && !nurses.some(n => n.id === admission.nurse_id)
    ? [{ id: admission.nurse_id, name: admission.nurse_name, ward: admission.ward, hospital_id: hospitalId, phone: '', status: 'Active' as const, created_at: admission.admitted_at }, ...nurses]
    : nurses

  return (
    <>
    <Modal isOpen={!!admission} onClose={onClose} title={editing ? 'ভর্তির তথ্য সম্পাদনা' : 'ভর্তির বিস্তারিত'} size="md">
      {!editing ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{admission.patient_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {admission.patient_phone ?? ''}
                {admission.patient_age ? ` · ${admission.patient_age} বছর` : ''}
                {admission.blood_group && admission.blood_group !== 'Unknown' ? ` · ${admission.blood_group}` : ''}
              </p>
              {admission.reason && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">কারণ: {admission.reason}</p>
              )}
            </div>
            <Badge variant={isActive ? 'green' : 'gray'}>
              {isActive ? 'ভর্তি' : 'ছাড়প্রাপ্ত'}
            </Badge>
          </div>

          {appointment && appointment.doctor_name && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ডাক্তার ও অ্যাপয়েন্টমেন্ট</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5 p-3 bg-violet-50 rounded-xl">
                  <Stethoscope className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">ডাক্তার</p>
                    <p className="text-sm font-semibold text-slate-800">{appointment.doctor_name || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">অ্যাপয়েন্টমেন্ট</p>
                    <p className="text-sm font-semibold text-slate-800">{appointment.date}</p>
                    <p className="text-xs text-slate-500">{appointment.time}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ভর্তি তথ্য</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <BedDouble className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">বেড</p>
                  <p className="text-sm font-semibold text-slate-800">{admission.bed_number}</p>
                  <p className="text-xs text-slate-500">{admission.ward}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Stethoscope className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">ডাক্তার</p>
                  <p className="text-sm font-semibold text-slate-800">{admission.doctor_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <User className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">নার্স</p>
                  <p className="text-sm font-semibold text-slate-800">{admission.nurse_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">ভর্তির সময়</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(admission.admitted_at)}</p>
                </div>
              </div>
              {admission.discharged_at && (
                <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">ছাড়ের সময়</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDateTime(admission.discharged_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">আর্থিক সারসংক্ষেপ</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">বেড ভাড়া (প্রতিদিন)</span>
                <span className="text-sm font-semibold text-slate-800">{formatCurrency(admission.bed_price_snapshot)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">মোট দিন</span>
                <span className="text-sm font-semibold text-slate-800">{days} দিন</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-green-50">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-800">
                    {isActive ? 'আনুমানিক মোট খরচ' : 'মোট বিল'}
                  </span>
                </div>
                <span className="text-base font-extrabold text-green-700">{formatCurrency(total)}</span>
              </div>
            </div>
            {isActive && (
              <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
                * রোগী ভর্তি থাকায় খরচ প্রতিদিন বাড়ছে
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-1">
            <div>
              {isActive && (
                <Button variant="ghost" onClick={() => setConfirmDischarge(true)} className="text-rose-600 hover:bg-rose-50">
                  <LogOut className="w-4 h-4" />ছেড়ে দিন
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>বন্ধ করুন</Button>
              {isActive && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4" />সম্পাদনা
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(d => { setErrorMsg(null); saveMutation.mutate(d) })}
          className="space-y-4"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">রোগীর তথ্য</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="পূর্ণ নাম" error={form.formState.errors.name?.message} {...form.register('name')} />
            <Input label="বয়স" type="number" {...form.register('age')} />
            <Select label="লিঙ্গ"
              options={[
                { value: 'Male',   label: 'পুরুষ'    },
                { value: 'Female', label: 'মহিলা'    },
                { value: 'Other',  label: 'অন্যান্য' },
              ]}
              {...form.register('gender')}
            />
            <Select label="রক্তের গ্রুপ (ঐচ্ছিক)"
              options={[
                { value: '', label: 'অজানা' },
                ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
              ]}
              {...form.register('blood_group')}
            />
          </div>
          <Input label="ঠিকানা" {...form.register('address')} />

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">ভর্তি বিবরণ</p>
          <Select label="বেড"
            error={form.formState.errors.bed_id?.message}
            options={bedOptions}
            placeholder="বেড নির্বাচন করুন"
            {...form.register('bed_id')}
          />
          <DoctorSearch
            doctors={doctors}
            selected={selectedDoctor}
            onSelect={(d) => { setSelectedDoctor(d); form.setValue('doctor_id', d.id) }}
            onClear={() => { setSelectedDoctor(null); form.setValue('doctor_id', '') }}
            optional
          />
          <NurseSearch
            nurses={nurseOptions}
            selected={selectedNurse}
            onSelect={(n) => { setSelectedNurse(n); form.setValue('nurse_id', n.id) }}
            onClear={() => { setSelectedNurse(null); form.setValue('nurse_id', '') }}
          />
          <Input label="ভর্তির কারণ" placeholder="যেমন: জ্বর, পরীক্ষা" {...form.register('reason')} />

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{errorMsg}</div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => { setEditing(false); setErrorMsg(null) }}>বাতিল</Button>
            <Button type="submit" loading={saveMutation.isPending}>সংরক্ষণ করুন</Button>
          </div>
        </form>
      )}
    </Modal>

    <ConfirmDialog
      isOpen={confirmDischarge}
      onClose={() => setConfirmDischarge(false)}
      onConfirm={() => { setConfirmDischarge(false); onDischarge(admission.id) }}
      title="রোগীকে ছেড়ে দিন"
      message="আপনি কি এই রোগীকে ছাড়প্রাপ্ত হিসেবে চিহ্নিত করতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
      tone="warning"
      confirmLabel="হ্যাঁ, ছেড়ে দিন"
      cancelLabel="না"
    />
    </>
  )
}

// ── Patient Phone Search ──────────────────────────────────────────────────────
function PatientPhoneSearch({
  patients,
  selected,
  onSelect,
  onClear,
  onNotFound,
  onPhoneChange,
}: {
  patients: Patient[]
  selected: Patient | null
  onSelect: (p: Patient) => void
  onClear: () => void
  onNotFound: (phone: string) => void
  onPhoneChange: (phone: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)

  const results = query.length >= 2
    ? patients.filter(p =>
        (p.phone ?? '').includes(query) ||
        p.name.includes(query) ||
        p.health_id.includes(query)
      ).slice(0, 8)
    : []

  const noMatch = query.length >= 11 && results.length === 0

  useEffect(() => {
    onPhoneChange(query)
  }, [query, onPhoneChange])

  useEffect(() => {
    if (noMatch) onNotFound(query)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMatch, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (selected) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">রোগী</label>
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="text-xs text-slate-500">{selected.phone} · {selected.health_id}</p>
            </div>
          </div>
          <button type="button" onClick={onClear}
            className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors">
            পরিবর্তন
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">রোগী খুঁজুন</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ফোন নম্বর, নাম বা হেলথ আইডি দিয়ে খুঁজুন..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {results.map(p => (
              <button key={p.id} type="button"
                onMouseDown={() => { onSelect(p); setQuery(''); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.phone} · {p.health_id}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 2 && results.length === 0 && query.length < 11 && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো রোগী পাওয়া যায়নি</p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdmissionsPage() {
  const { user }    = useAuthStore()
  const hospitalId  = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()

  const [viewAdmission, setViewAdmission] = useState<Admission | null>(null)
  const [admitOpen,     setAdmitOpen]     = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [showNewUser,   setShowNewUser]   = useState(false)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn:  () => api.manager.getAdmissions(),
  })
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', hospitalId],
    queryFn:  () => api.manager.getAppointments(hospitalId),
  })
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn:  () => api.manager.getPatients(),
    enabled:  admitOpen,
  })
  const { data: availableBeds = [] } = useQuery({
    queryKey: ['available-beds', hospitalId],
    queryFn:  () => api.manager.getAvailableBeds(hospitalId),
  })
  const { data: availableNurses = [] } = useQuery({
    queryKey: ['available-nurses', hospitalId],
    queryFn:  () => api.manager.getAvailableNurses(hospitalId),
  })
  const { data: doctors = [] } = useQuery({
    queryKey: ['active-doctors', hospitalId],
    queryFn:  () => api.manager.getDoctors(hospitalId),
  })

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<DirectAdmitForm>({
    resolver: zodResolver(directAdmitSchema),
    defaultValues: { gender: 'Male', reason: '' },
  })

  // ── Mutation ──────────────────────────────────────────────────────────────
  const admitMutation = useMutation({
    mutationFn: (data: DirectAdmitForm) =>
      api.manager.directAdmit({
        phone:       data.phone,
        bed_id:      data.bed_id,
        nurse_id:    data.nurse_id || undefined,
        doctor_id:   data.doctor_id || undefined,
        reason:      data.reason || undefined,
        name:        data.name || undefined,
        age:         data.age ? Number(data.age) : undefined,
        gender:      data.gender,
        blood_group: data.blood_group || undefined,
      }),
    onSuccess: (admission) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['available-beds', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['available-nurses', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      if (admission.created_new_user) {
        alert(`নতুন রোগী তৈরি হয়েছে। ডিফল্ট পাসওয়ার্ড: 123456`)
      }
      closeAdmit()
    },
    onError: (err: Error) => setErrorMsg(err.message || 'ভর্তি ব্যর্থ হয়েছে'),
  })

  const dischargeMutation = useMutation({
    mutationFn: (id: string) => api.manager.dischargeAdmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['available-beds', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['available-nurses', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard', hospitalId] })
      setViewAdmission(null)
    },
  })

  const getAppointment = (id: string) => appointments.find(a => a.id === id)

  const [searchQuery, setSearchQuery] = useState('')

  const { current, discharged } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const matches = (a: Admission) => {
      if (!q) return true
      const name  = (a.patient_name ?? '').toLowerCase()
      const phone = (a.patient_phone ?? '').toLowerCase()
      // Bengali-aware fallback (case-folding doesn't affect non-Latin scripts)
      return (
        name.includes(q)  || (a.patient_name ?? '').includes(searchQuery) ||
        phone.includes(q) || (a.patient_phone ?? '').includes(searchQuery)
      )
    }
    return {
      current:    admissions.filter(a => !a.discharged_at && matches(a)),
      discharged: admissions.filter(a => !!a.discharged_at && matches(a)),
    }
  }, [admissions, searchQuery])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdmit = () => {
    form.reset({ gender: 'Male', reason: '' })
    setSelectedPatient(null)
    setSelectedNurse(null)
    setSelectedDoctor(null)
    setShowNewUser(false)
    setErrorMsg(null)
    setAdmitOpen(true)
  }
  const closeAdmit = () => {
    setAdmitOpen(false)
    setSelectedPatient(null)
    setSelectedNurse(null)
    setSelectedDoctor(null)
    setShowNewUser(false)
    setErrorMsg(null)
    form.reset({ gender: 'Male', reason: '' })
  }
  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p)
    setShowNewUser(false)
    form.setValue('phone', p.phone ?? '')
    form.setValue('name', p.name)
  }
  const handlePatientClear = () => {
    setSelectedPatient(null)
    setShowNewUser(false)
    form.setValue('phone', '')
    form.setValue('name', '')
  }
  const handleNotFound = (phone: string) => {
    setShowNewUser(true)
    form.setValue('phone', phone)
  }
  const handlePhoneChange = (phone: string) => {
    if (!selectedPatient) form.setValue('phone', phone)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ভর্তি ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            বর্তমানে ভর্তি {current.length}জন | ছাড়প্রাপ্ত {discharged.length}জন
          </p>
        </div>
        <Button onClick={openAdmit}>
          <Plus className="w-4 h-4" />
          নতুন ভর্তি
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            aria-label="সাফ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Currently admitted */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">বর্তমানে ভর্তি রোগী</h3>
        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHead columns={['রোগীর নাম', 'বেড', 'ওয়ার্ড', 'নার্স', 'ভর্তির সময়', 'মূল্য/দিন', 'স্ট্যাটাস', '']} />
            <TableBody isEmpty={current.length === 0} emptyMessage={searchQuery ? 'কোনো ফলাফল পাওয়া যায়নি' : 'বর্তমানে কোনো ভর্তি রোগী নেই'} colSpan={8}>
              {current.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><span className="font-medium">{a.patient_name}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-slate-400" />
                      {a.bed_number}
                    </div>
                  </TableCell>
                  <TableCell>{a.ward}</TableCell>
                  <TableCell>{a.nurse_name}</TableCell>
                  <TableCell>{formatDateTime(a.admitted_at)}</TableCell>
                  <TableCell>{formatCurrency(a.bed_price_snapshot)}</TableCell>
                  <TableCell><Badge variant="green">ভর্তি</Badge></TableCell>
                  <TableCell>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="বিস্তারিত দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3">
          {current.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
              {searchQuery ? 'কোনো ফলাফল পাওয়া যায়নি' : 'বর্তমানে কোনো ভর্তি রোগী নেই'}
            </div>
          ) : (
            current.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.patient_name}</p>
                    <p className="text-sm text-slate-500">বেড {a.bed_number} | {a.ward}</p>
                    <p className="text-sm text-slate-500">নার্স: {a.nurse_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(a.admitted_at)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(a.bed_price_snapshot)}/দিন</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="green">ভর্তি</Badge>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Discharged */}
      {discharged.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">ছাড়প্রাপ্ত রোগী</h3>
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHead columns={['রোগীর নাম', 'বেড', 'ওয়ার্ড', 'ভর্তির সময়', 'ছাড়ের সময়', 'স্ট্যাটাস', '']} />
              <TableBody isEmpty={false} emptyMessage="" colSpan={7}>
                {discharged.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><span className="font-medium">{a.patient_name}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        {a.bed_number}
                      </div>
                    </TableCell>
                    <TableCell>{a.ward}</TableCell>
                    <TableCell>{formatDateTime(a.admitted_at)}</TableCell>
                    <TableCell>{a.discharged_at ? formatDateTime(a.discharged_at) : '—'}</TableCell>
                    <TableCell><Badge variant="gray">ছাড়প্রাপ্ত</Badge></TableCell>
                    <TableCell>
                      <button
                        onClick={() => setViewAdmission(a)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {discharged.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.patient_name}</p>
                    <p className="text-sm text-slate-500">বেড {a.bed_number} | {a.ward}</p>
                    <p className="text-xs text-slate-400 mt-1">ভর্তি: {formatDateTime(a.admitted_at)}</p>
                    {a.discharged_at && (
                      <p className="text-xs text-slate-400">ছাড়: {formatDateTime(a.discharged_at)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="gray">ছাড়প্রাপ্ত</Badge>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manual Admission Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={admitOpen}
        onClose={closeAdmit}
        title="রোগী ভর্তি করুন"
        subtitle="রোগীর ফোন নম্বর দিয়ে খুঁজুন। না থাকলে নতুন রোগী হিসেবে যোগ করুন।"
        size="md"
      >
        <form
          onSubmit={form.handleSubmit(d => {
            setErrorMsg(null)
            // If new-user form is shown, name is required
            if (showNewUser && !selectedPatient && !(d.name && d.name.trim())) {
              form.setError('name', { message: 'নাম দিন' })
              return
            }
            admitMutation.mutate(d)
          })}
          className="space-y-4"
        >
          <PatientPhoneSearch
            patients={patients}
            selected={selectedPatient}
            onSelect={handlePatientSelect}
            onClear={handlePatientClear}
            onNotFound={handleNotFound}
            onPhoneChange={handlePhoneChange}
          />

          {form.formState.errors.phone && !selectedPatient && (
            <p className="text-xs text-red-500 -mt-2">{form.formState.errors.phone.message}</p>
          )}

          {/* New user form — only when phone has no match */}
          {showNewUser && !selectedPatient && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-700">নতুন রোগী হিসেবে যোগ করুন</p>
                </div>
                <button type="button"
                  onClick={() => { setShowNewUser(false); form.setValue('name', '') }}
                  className="text-amber-400 hover:text-amber-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-amber-700/80">
                ডিফল্ট পাসওয়ার্ড: <span className="font-mono font-bold">123456</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="পূর্ণ নাম" error={form.formState.errors.name?.message} {...form.register('name')} />
                <Input label="বয়স" type="number" {...form.register('age')} />
                <Select label="লিঙ্গ"
                  options={[
                    { value: 'Male',   label: 'পুরুষ'    },
                    { value: 'Female', label: 'মহিলা'    },
                    { value: 'Other',  label: 'অন্যান্য' },
                  ]}
                  {...form.register('gender')}
                />
                <Select label="রক্তের গ্রুপ (ঐচ্ছিক)"
                  options={[
                    { value: '', label: 'অজানা' },
                    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
                  ]}
                  {...form.register('blood_group')}
                />
              </div>
            </div>
          )}

          {/* Bed */}
          <Select label="বেড নির্বাচন করুন"
            error={form.formState.errors.bed_id?.message}
            options={availableBeds.map(b => ({ value: b.id, label: `বেড ${b.number} — ${b.ward} (${b.type})` }))}
            placeholder={availableBeds.length === 0 ? 'কোনো খালি বেড নেই' : 'বেড নির্বাচন করুন'}
            {...form.register('bed_id')}
          />

          {/* Doctor — searchable & optional */}
          <DoctorSearch
            doctors={doctors}
            selected={selectedDoctor}
            onSelect={(d) => { setSelectedDoctor(d); form.setValue('doctor_id', d.id) }}
            onClear={() => { setSelectedDoctor(null); form.setValue('doctor_id', '') }}
            optional
          />

          {/* Nurse — searchable & optional */}
          <NurseSearch
            nurses={availableNurses}
            selected={selectedNurse}
            onSelect={(n) => { setSelectedNurse(n); form.setValue('nurse_id', n.id) }}
            onClear={() => { setSelectedNurse(null); form.setValue('nurse_id', '') }}
          />

          <Input label="ভর্তির কারণ (ঐচ্ছিক)" placeholder="যেমন: জ্বর, পরীক্ষা" {...form.register('reason')} />

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={closeAdmit}>বাতিল</Button>
            <Button type="submit" loading={admitMutation.isPending}>
              ভর্তি করুন
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail / Edit modal */}
      <AdmissionDetailModal
        admission={viewAdmission}
        appointment={viewAdmission ? getAppointment(viewAdmission.appointment_id) : undefined}
        beds={availableBeds}
        nurses={availableNurses}
        doctors={doctors}
        onClose={() => setViewAdmission(null)}
        onDischarge={(id) => dischargeMutation.mutate(id)}
      />
    </div>
  )
}
