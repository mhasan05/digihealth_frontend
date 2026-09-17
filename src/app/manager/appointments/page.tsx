"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('apptPage.patientLabel')}</label>
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
            {t('apptPage.change')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {t('apptPage.searchPatient')}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={t('apptPage.searchPatientPlaceholder')}
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
          <p className="mt-1.5 text-xs text-slate-400 pl-1">{t('apptPage.noPatientFound')}</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { t }           = useTranslation()
  const { user }        = useAuthStore()
  const hospitalId       = user?.active_hospital_id ?? 'h1'
  const queryClient      = useQueryClient()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all',       label: t('apptPage.tabAll')       },
    { id: 'Pending',   label: t('apptPage.tabPending')   },
    { id: 'Confirmed', label: t('apptPage.tabConfirmed') },
    { id: 'Completed', label: t('apptPage.tabCompleted') },
    { id: 'Cancelled', label: t('apptPage.tabCancelled') },
  ]

  const aptSchema = useMemo(() => z.object({
    patient_id: z.string().min(1, t('apptPage.selectPatient')),
    doctor_id:  z.string().optional(),
    date:       z.string().min(1, t('apptPage.dateRequired')),
    time:       z.string().min(1, t('apptPage.timeRequired')),
    reason:     z.string().min(2, t('apptPage.reasonRequired')),
    status:     z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']).optional(),
  }), [t])
  type AptForm = z.infer<typeof aptSchema>

  const walkInSchema = useMemo(() => z.object({
    name:        z.string().min(2,  t('apptPage.nameRequired')),
    phone:       z.string().min(11, t('apptPage.phoneRequired')),
    age:         z.string().min(1,  t('apptPage.ageRequired')),
    gender:      z.enum(['Male', 'Female', 'Other']),
    blood_group: z.string().optional(),
  }), [t])
  type WalkInForm = z.infer<typeof walkInSchema>

  const admitSchema = useMemo(() => z.object({
    bed_id:   z.string().min(1, t('apptPage.selectBed')),
    nurse_id: z.string().optional(),
  }), [t])
  type AdmitForm = z.infer<typeof admitSchema>

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
          <h2 className="text-xl font-bold text-slate-900">{t('apptPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('apptPage.totalCount', { count: visibleAppointments.length })}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          {t('apptPage.newAppointment')}
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
            placeholder={t('apptPage.searchPlaceholder')}
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
          <TableHead columns={[
            t('apptPage.colPatient'),
            t('apptPage.colDoctor'),
            t('apptPage.colDateTime'),
            t('apptPage.colReason'),
            t('common.status'),
            t('common.actions'),
          ]} />
          <TableBody isEmpty={filtered.length === 0} emptyMessage={searchQuery || dateFilter ? t('apptPage.noResults') : t('apptPage.noAppointments')} colSpan={6}>
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
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title={t('apptPage.confirm')}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setCancelId(a.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('apptPage.cancel')}>
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {a.status === 'Confirmed' && !a.admitted && (
                      <button onClick={() => { admitForm.reset(); setAdmitApt(a) }}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title={t('apptPage.admit')}>
                        <BedDouble className="w-4 h-4" />
                      </button>
                    )}
                    {a.admitted && <span className="text-xs text-green-600 font-medium px-1">{t('apptPage.admittedShort')}</span>}
                    {!a.admitted && (
                      <button onClick={() => handleOpenEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title={t('common.edit')}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {(a.status === 'Pending' || a.status === 'Cancelled') && (
                      <button onClick={() => setDeleteId(a.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>
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
        title={isEdit ? t('apptPage.editTitle') : t('apptPage.createTitle')}
        subtitle={!isEdit ? t('apptPage.createSubtitle') : undefined}
        size="md"
      >
        <form onSubmit={aptForm.handleSubmit(d => isEdit ? updateMutation.mutate(d) : createMutation.mutate(d))}
          className="space-y-4">

          {/* Patient section — search on create, locked on edit */}
          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('apptPage.patientLabel')}</label>
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
                      <p className="text-xs font-bold text-amber-700">{t('apptPage.addAsNewPatient')}</p>
                    </div>
                    <button type="button"
                      onClick={() => { setShowWalkIn(false); setWalkInPhone('') }}
                      className="text-amber-400 hover:text-amber-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label={t('apptPage.fullName')} error={walkInForm.formState.errors.name?.message}  {...walkInForm.register('name')} />
                    <Input label={t('common.phone')} error={walkInForm.formState.errors.phone?.message} {...walkInForm.register('phone')} />
                    <Input label={t('patient.age')} type="number" error={walkInForm.formState.errors.age?.message} {...walkInForm.register('age')} />
                    <Select label={t('patient.gender')} error={walkInForm.formState.errors.gender?.message}
                      options={[
                        { value: 'Male',   label: t('patient.male')   },
                        { value: 'Female', label: t('patient.female') },
                        { value: 'Other',  label: t('patient.other')  },
                      ]}
                      {...walkInForm.register('gender')}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <Select label={t('apptPage.bloodGroupOptional')}
                      options={[
                        { value: '', label: t('settings.unknownBloodGroup') },
                        ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
                      ]}
                      {...walkInForm.register('blood_group')}
                    />
                    <Button type="button" loading={walkInMutation.isPending}
                      onClick={walkInForm.handleSubmit(d => walkInMutation.mutate(d))}>
                      {t('apptPage.createAndSelect')}
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
            <Input label={t('apptPage.date')} type="date" error={aptForm.formState.errors.date?.message} {...aptForm.register('date')} />
            <Input label={t('apptPage.time')} type="time" error={aptForm.formState.errors.time?.message}  {...aptForm.register('time')} />
          </div>

          <Input label={t('apptPage.reason')} error={aptForm.formState.errors.reason?.message} {...aptForm.register('reason')} />

          {/* Status — editable on edit only */}
          {isEdit && (
            <Select label={t('common.status')}
              error={aptForm.formState.errors.status?.message}
              options={[
                { value: 'Pending',   label: t('apptPage.tabPending')   },
                { value: 'Confirmed', label: t('apptPage.tabConfirmed') },
                { value: 'Completed', label: t('apptPage.tabCompleted') },
                { value: 'Cancelled', label: t('apptPage.tabCancelled') },
              ]}
              {...aptForm.register('status')}
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? t('staffPage.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Admit Modal ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!admitApt}
        onClose={() => { setAdmitApt(null); setSelectedNurse(null); admitForm.reset() }}
        title={t('apptPage.admitModalTitle', { name: admitApt?.patient_name ?? '' })}
        size="sm"
      >
        <form onSubmit={admitForm.handleSubmit(d => admitMutation.mutate(d))} className="space-y-4">
          <Select label={t('apptPage.selectBed')}
            error={admitForm.formState.errors.bed_id?.message}
            options={availableBeds.map(b => ({ value: b.id, label: t('apptPage.bedOption', { number: b.number, ward: b.ward, type: b.type }) }))}
            placeholder={t('apptPage.selectBed')}
            {...admitForm.register('bed_id')}
          />
          <NurseSearch
            nurses={availableNurses}
            selected={selectedNurse}
            onSelect={(n) => { setSelectedNurse(n); admitForm.setValue('nurse_id', n.id) }}
            onClear={() => { setSelectedNurse(null); admitForm.setValue('nurse_id', '') }}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setAdmitApt(null); setSelectedNurse(null); admitForm.reset() }}>{t('common.cancel')}</Button>
            <Button type="submit" loading={admitMutation.isPending}>{t('apptPage.admit')}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm / Cancel / Delete dialogs ────────────────────────────── */}
      <ConfirmDialog isOpen={!!confirmId} onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && confirmMutation.mutate(confirmId)}
        title={t('apptPage.admitConfirmTitle')}
        message={t('apptPage.admitConfirmMessage')}
        tone="primary"
        confirmLabel={t('apptPage.yes')}
        cancelLabel={t('apptPage.no')}
        isLoading={confirmMutation.isPending}
      />
      <ConfirmDialog isOpen={!!cancelId} onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        title={t('apptPage.cancelTitle')}
        message={t('apptPage.cancelMessage')}
        tone="warning"
        confirmLabel={t('apptPage.yesCancelIt')}
        cancelLabel={t('apptPage.no')}
        isLoading={cancelMutation.isPending}
      />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('apptPage.deleteTitle')}
        message={t('apptPage.deleteMessage')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
