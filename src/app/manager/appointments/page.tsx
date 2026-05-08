"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { NurseSearch } from '@/components/shared/nurse-search'
import { DoctorSearch } from '@/components/shared/doctor-search'
import { formatDate } from '@/lib/utils'
import { Plus, Check, X, BedDouble, UserPlus, Search, Pencil, Trash2, User } from 'lucide-react'
import type { Appointment, AppointmentStatus, Patient, Doctor, Nurse } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'all' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'

const tabs: { id: Tab; label: string }[] = [
  { id: 'all',       label: 'সব'      },
  { id: 'Pending',   label: 'মুলতুবি'  },
  { id: 'Confirmed', label: 'নিশ্চিত'  },
  { id: 'Completed', label: 'সম্পন্ন'  },
  { id: 'Cancelled', label: 'বাতিল'   },
]

// ── Schemas ───────────────────────────────────────────────────────────────────
const aptSchema = z.object({
  patient_id: z.string().min(1, 'রোগী নির্বাচন করুন'),
  doctor_id:  z.string().optional(),
  date:       z.string().min(1, 'তারিখ দিন'),
  time:       z.string().min(1, 'সময় দিন'),
  reason:     z.string().min(2, 'কারণ দিন'),
  status:     z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']).optional(),
})
type AptForm = z.infer<typeof aptSchema>

const walkInSchema = z.object({
  name:        z.string().min(2,  'নাম দিন'),
  phone:       z.string().min(11, 'ফোন নম্বর দিন'),
  age:         z.string().min(1,  'বয়স দিন'),
  gender:      z.enum(['Male', 'Female', 'Other']),
  blood_group: z.string().optional(),
})
type WalkInForm = z.infer<typeof walkInSchema>

const admitSchema = z.object({
  bed_id:   z.string().min(1, 'বেড নির্বাচন করুন'),
  nurse_id: z.string().optional(),
})
type AdmitForm = z.infer<typeof admitSchema>

// ── Patient Phone Search ──────────────────────────────────────────────────────
function PatientSearch({
  patients,
  selected,
  onSelect,
  onClear,
  error,
  onNotFound,
}: {
  patients: Patient[]
  selected: Patient | null
  onSelect: (p: Patient) => void
  onClear: () => void
  error?: string
  onNotFound: (phone: string) => void
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const wrapRef             = useRef<HTMLDivElement>(null)

  const results = query.length >= 2
    ? patients.filter(p =>
        (p.phone ?? '').includes(query) ||
        p.name.includes(query) ||
        p.health_id.includes(query)
      ).slice(0, 8)
    : []

  const noMatch = query.length >= 11 && results.length === 0

  // Auto-trigger create form when 11-digit phone has no match
  useEffect(() => {
    if (noMatch) onNotFound(query)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMatch, query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        রোগী খুঁজুন
      </label>
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
        {/* Dropdown results */}
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
        {/* No results hint */}
        {open && query.length >= 2 && results.length === 0 && query.length < 11 && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো রোগী পাওয়া যায়নি</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { user }       = useAuthStore()
  const hospitalId     = user?.active_hospital_id ?? 'h1'
  const queryClient    = useQueryClient()

  const [activeTab,       setActiveTab]       = useState<Tab>('all')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [dateFilter,      setDateFilter]      = useState('')
  const [modalOpen,       setModalOpen]       = useState(false)
  const [editApt,         setEditApt]         = useState<Appointment | null>(null)
  const [admitApt,        setAdmitApt]        = useState<Appointment | null>(null)
  const [confirmId,       setConfirmId]       = useState<string | null>(null)
  const [cancelId,        setCancelId]        = useState<string | null>(null)
  const [deleteId,        setDeleteId]        = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor,  setSelectedDoctor]  = useState<Doctor | null>(null)
  const [selectedNurse,   setSelectedNurse]   = useState<Nurse | null>(null)
  const [showWalkIn,      setShowWalkIn]      = useState(false)
  const [walkInPhone,     setWalkInPhone]     = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', hospitalId],
    queryFn:  () => api.manager.getAppointments(hospitalId),
  })
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn:  () => api.manager.getPatients(),
  })
  const { data: doctors = [] } = useQuery({
    queryKey: ['active-doctors', hospitalId],
    queryFn:  () => api.manager.getDoctors(hospitalId),
  })
  const { data: availableBeds = [] } = useQuery({
    queryKey: ['available-beds', hospitalId],
    queryFn:  () => api.manager.getAvailableBeds(hospitalId),
    enabled:  !!admitApt,
  })
  const { data: availableNurses = [] } = useQuery({
    queryKey: ['available-nurses', hospitalId],
    queryFn:  () => api.manager.getAvailableNurses(hospitalId),
    enabled:  !!admitApt,
  })

  // ── Forms ────────────────────────────────────────────────────────────────
  const aptForm = useForm<AptForm>({ resolver: zodResolver(aptSchema) })
  const walkInForm = useForm<WalkInForm>({
    resolver: zodResolver(walkInSchema),
    defaultValues: { gender: 'Male' },
  })
  const admitForm = useForm<AdmitForm>({ resolver: zodResolver(admitSchema) })

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments', hospitalId] })
    queryClient.invalidateQueries({ queryKey: ['manager-dashboard', hospitalId] })
  }

  const createMutation = useMutation({
    mutationFn: (data: AptForm) => {
      const patient = patients.find(p => p.id === data.patient_id)!
      const doctor  = data.doctor_id ? doctors.find(d => d.id === data.doctor_id) : null
      return api.manager.createAppointment(hospitalId, {
        patient_id: data.patient_id, patient_name: patient.name,
        doctor_id:  doctor?.id ?? null, doctor_name: doctor?.name ?? '',
        date: data.date, time: data.time, reason: data.reason,
        status: 'Pending' as AppointmentStatus,
      })
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: AptForm) => {
      const doctor = data.doctor_id ? doctors.find(d => d.id === data.doctor_id) : null
      return api.manager.updateAppointment(editApt!.id, {
        doctor_id: doctor?.id ?? null, doctor_name: doctor?.name ?? '',
        date: data.date, time: data.time, reason: data.reason,
        ...(data.status ? { status: data.status as AppointmentStatus } : {}),
      })
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.manager.deleteAppointment(id),
    onSuccess: () => { invalidate(); setDeleteId(null) },
  })

  const walkInMutation = useMutation({
    mutationFn: (data: WalkInForm) =>
      api.manager.createWalkInPatient({ name: data.name, phone: data.phone, age: Number(data.age), gender: data.gender, blood_group: data.blood_group || undefined }),
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setSelectedPatient(newPatient)
      aptForm.setValue('patient_id', newPatient.id)
      setShowWalkIn(false)
      walkInForm.reset({ gender: 'Male' })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.manager.confirmAppointment(id),
    onSuccess: () => { invalidate(); setConfirmId(null) },
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.manager.cancelAppointment(id),
    onSuccess: () => { invalidate(); setCancelId(null) },
  })
  const admitMutation = useMutation({
    mutationFn: (data: AdmitForm) => api.manager.admitPatient(admitApt!.id, {
      bed_id: data.bed_id,
      ...(data.nurse_id ? { nurse_id: data.nurse_id } : {}),
    }),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['available-beds', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['available-nurses', hospitalId] })
      setAdmitApt(null)
      setSelectedNurse(null)
      admitForm.reset()
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false)
    setEditApt(null)
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setShowWalkIn(false)
    setWalkInPhone('')
    aptForm.reset()
    walkInForm.reset({ gender: 'Male' })
  }

  const handleOpenCreate = () => {
    setEditApt(null)
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setShowWalkIn(false)
    setWalkInPhone('')
    aptForm.reset()
    setModalOpen(true)
  }

  const handleOpenEdit = (a: Appointment) => {
    setEditApt(a)
    setSelectedPatient(null)
    // Pre-select the doctor chip from the doctors list
    const doc = doctors.find(d => d.id === a.doctor_id) ?? null
    setSelectedDoctor(doc)
    setShowWalkIn(false)
    aptForm.reset({
      patient_id: a.patient_id,
      doctor_id:  a.doctor_id ?? undefined,
      date:       a.date,
      time:       a.time,
      reason:     a.reason,
      status:     a.status,
    })
    setModalOpen(true)
  }

  const handleNotFound = (phone: string) => {
    setWalkInPhone(phone)
    setShowWalkIn(true)
    walkInForm.setValue('phone', phone)
  }

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p)
    aptForm.setValue('patient_id', p.id)
    setShowWalkIn(false)
    setWalkInPhone('')
  }

  const handlePatientClear = () => {
    setSelectedPatient(null)
    aptForm.setValue('patient_id', '')
    setShowWalkIn(false)
    setWalkInPhone('')
  }

  const handleDoctorSelect = (d: Doctor) => {
    setSelectedDoctor(d)
    aptForm.setValue('doctor_id', d.id)
  }

  const handleDoctorClear = () => {
    setSelectedDoctor(null)
    aptForm.setValue('doctor_id', '')
  }

  // Admitted appointments are managed in the admissions page — hide them here
  const visibleAppointments = useMemo(() => appointments.filter(a => !a.admitted), [appointments])

  const filtered = useMemo(() => visibleAppointments.filter(a => {
    if (activeTab !== 'all' && a.status !== activeTab) return false
    if (dateFilter && a.date !== dateFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        a.patient_name.toLowerCase().includes(q) ||
        a.doctor_name.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      )
    }
    return true
  }), [visibleAppointments, activeTab, dateFilter, searchQuery])

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of visibleAppointments) counts[a.status] = (counts[a.status] ?? 0) + 1
    return counts
  }, [visibleAppointments])

  const isEdit = !!editApt

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">অ্যাপয়েন্টমেন্ট ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {visibleAppointments.length}টি অ্যাপয়েন্টমেন্ট</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          নতুন অ্যাপয়েন্টমেন্ট
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}>
            {tab.label}
            {tab.id !== 'all' && (tabCounts[tab.id] ?? 0) > 0 && (
              <span className="ml-1.5 text-xs text-slate-400">
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & date filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="রোগী, ডাক্তার বা কারণ দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative sm:w-48">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
          />
          {dateFilter && (
            <button type="button" onClick={() => setDateFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['রোগী', 'ডাক্তার', 'তারিখ ও সময়', 'কারণ', 'স্ট্যাটাস', 'কার্যক্রম']} />
          <TableBody isEmpty={filtered.length === 0} emptyMessage={searchQuery || dateFilter ? 'কোনো ফলাফল পাওয়া যায়নি' : 'কোনো অ্যাপয়েন্টমেন্ট নেই'} colSpan={6}>
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell><span className="font-medium">{a.patient_name}</span></TableCell>
                <TableCell>{a.doctor_name}</TableCell>
                <TableCell>
                  <p className="text-sm">{formatDate(a.date)}</p>
                  <p className="text-xs text-slate-500">{a.time}</p>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600 max-w-[140px] truncate block">{a.reason}</span>
                </TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {a.status === 'Pending' && (
                      <>
                        <button onClick={() => setConfirmId(a.id)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="নিশ্চিত করুন">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setCancelId(a.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="বাতিল করুন">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {a.status === 'Confirmed' && !a.admitted && (
                      <button onClick={() => { admitForm.reset(); setAdmitApt(a) }}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="ভর্তি করুন">
                        <BedDouble className="w-4 h-4" />
                      </button>
                    )}
                    {a.admitted && <span className="text-xs text-green-600 font-medium px-1">ভর্তি</span>}
                    {!a.admitted && (
                      <button onClick={() => handleOpenEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="সম্পাদনা">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {(a.status === 'Pending' || a.status === 'Cancelled') && (
                      <button onClick={() => setDeleteId(a.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="মুছুন">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{a.patient_name}</p>
                <p className="text-sm text-slate-500">{a.doctor_name} · {formatDate(a.date)} {a.time}</p>
                <p className="text-xs text-slate-400 mt-1">{a.reason}</p>
                <div className="mt-2"><StatusBadge status={a.status} /></div>
              </div>
              <div className="flex gap-1">
                {a.status === 'Pending' && (
                  <>
                    <button onClick={() => setConfirmId(a.id)} className="p-1.5 text-slate-400 hover:text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setCancelId(a.id)} className="p-1.5 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </>
                )}
                {a.status === 'Confirmed' && !a.admitted && (
                  <button onClick={() => { admitForm.reset(); setAdmitApt(a) }} className="p-1.5 text-slate-400 hover:text-green-600"><BedDouble className="w-4 h-4" /></button>
                )}
                {!a.admitted && (
                  <button onClick={() => handleOpenEdit(a)} className="p-1.5 text-slate-400 hover:text-green-600"><Pencil className="w-4 h-4" /></button>
                )}
                {(a.status === 'Pending' || a.status === 'Cancelled') && (
                  <button onClick={() => setDeleteId(a.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEdit ? 'অ্যাপয়েন্টমেন্ট সম্পাদনা' : 'নতুন অ্যাপয়েন্টমেন্ট'}
        subtitle={!isEdit ? 'রোগীর ফোন নম্বর দিয়ে খুঁজুন। না থাকলে নতুন রোগী হিসেবে যোগ করুন।' : undefined}
        size="md"
      >
        <form onSubmit={aptForm.handleSubmit(d => isEdit ? updateMutation.mutate(d) : createMutation.mutate(d))}
          className="space-y-4">

          {/* Patient section — search on create, locked on edit */}
          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">রোগী</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{editApt?.patient_name}</p>
              </div>
            </div>
          ) : (
            <>
              <PatientSearch
                patients={patients}
                selected={selectedPatient}
                onSelect={handlePatientSelect}
                onClear={handlePatientClear}
                error={aptForm.formState.errors.patient_id?.message}
                onNotFound={handleNotFound}
              />

              {/* Walk-in form — auto-shown when phone not found */}
              {showWalkIn && !selectedPatient && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs font-bold text-amber-700">নতুন রোগী হিসেবে যোগ করুন</p>
                    </div>
                    <button type="button"
                      onClick={() => { setShowWalkIn(false); setWalkInPhone('') }}
                      className="text-amber-400 hover:text-amber-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="পূর্ণ নাম"   error={walkInForm.formState.errors.name?.message}  {...walkInForm.register('name')} />
                    <Input label="ফোন নম্বর"   error={walkInForm.formState.errors.phone?.message} {...walkInForm.register('phone')} />
                    <Input label="বয়স" type="number" error={walkInForm.formState.errors.age?.message} {...walkInForm.register('age')} />
                    <Select label="লিঙ্গ" error={walkInForm.formState.errors.gender?.message}
                      options={[
                        { value: 'Male',   label: 'পুরুষ'   },
                        { value: 'Female', label: 'মহিলা'   },
                        { value: 'Other',  label: 'অন্যান্য' },
                      ]}
                      {...walkInForm.register('gender')}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <Select label="রক্তের গ্রুপ (ঐচ্ছিক)"
                      options={[
                        { value: '', label: 'অজানা' },
                        ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
                      ]}
                      {...walkInForm.register('blood_group')}
                    />
                    <Button type="button" loading={walkInMutation.isPending}
                      onClick={walkInForm.handleSubmit(d => walkInMutation.mutate(d))}>
                      তৈরি করুন ও নির্বাচন করুন
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Doctor */}
          <DoctorSearch
            doctors={doctors}
            selected={selectedDoctor}
            onSelect={handleDoctorSelect}
            onClear={handleDoctorClear}
            error={aptForm.formState.errors.doctor_id?.message}
            optional
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input label="তারিখ" type="date" error={aptForm.formState.errors.date?.message} {...aptForm.register('date')} />
            <Input label="সময়"   type="time" error={aptForm.formState.errors.time?.message}  {...aptForm.register('time')} />
          </div>

          <Input label="কারণ" error={aptForm.formState.errors.reason?.message} {...aptForm.register('reason')} />

          {/* Status — editable on edit only */}
          {isEdit && (
            <Select label="স্ট্যাটাস"
              error={aptForm.formState.errors.status?.message}
              options={[
                { value: 'Pending',   label: 'মুলতুবি' },
                { value: 'Confirmed', label: 'নিশ্চিত' },
                { value: 'Completed', label: 'সম্পন্ন' },
                { value: 'Cancelled', label: 'বাতিল'   },
              ]}
              {...aptForm.register('status')}
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>বাতিল</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Admit Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!admitApt}
        onClose={() => { setAdmitApt(null); setSelectedNurse(null); admitForm.reset() }}
        title={`রোগী ভর্তি — ${admitApt?.patient_name ?? ''}`}
        size="sm"
      >
        <form onSubmit={admitForm.handleSubmit(d => admitMutation.mutate(d))} className="space-y-4">
          <Select label="বেড নির্বাচন করুন"
            error={admitForm.formState.errors.bed_id?.message}
            options={availableBeds.map(b => ({ value: b.id, label: `বেড ${b.number} — ${b.ward} (${b.type})` }))}
            placeholder="বেড নির্বাচন করুন"
            {...admitForm.register('bed_id')}
          />
          <NurseSearch
            nurses={availableNurses}
            selected={selectedNurse}
            onSelect={(n) => { setSelectedNurse(n); admitForm.setValue('nurse_id', n.id) }}
            onClear={() => { setSelectedNurse(null); admitForm.setValue('nurse_id', '') }}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setAdmitApt(null); setSelectedNurse(null); admitForm.reset() }}>বাতিল</Button>
            <Button type="submit" loading={admitMutation.isPending}>ভর্তি করুন</Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm / Cancel / Delete dialogs ────────────────────────────── */}
      <ConfirmDialog isOpen={!!confirmId} onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && confirmMutation.mutate(confirmId)}
        title="অ্যাপয়েন্টমেন্ট নিশ্চিত করুন"
        message="আপনি কি এই অ্যাপয়েন্টমেন্টটি নিশ্চিত করতে চান?"
        tone="primary"
        confirmLabel="হ্যাঁ"
        cancelLabel="না"
        isLoading={confirmMutation.isPending}
      />
      <ConfirmDialog isOpen={!!cancelId} onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        title="অ্যাপয়েন্টমেন্ট বাতিল করুন"
        message="আপনি কি এই অ্যাপয়েন্টমেন্টটি বাতিল করতে চান?"
        tone="warning"
        confirmLabel="হ্যাঁ, বাতিল করুন"
        cancelLabel="না"
        isLoading={cancelMutation.isPending}
      />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="অ্যাপয়েন্টমেন্ট মুছুন"
        message="আপনি কি এই অ্যাপয়েন্টমেন্টটি স্থায়ীভাবে মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
