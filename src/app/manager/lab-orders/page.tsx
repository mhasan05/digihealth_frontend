"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { DoctorSearch } from '@/components/shared/doctor-search'
import { PathologistSearch } from '@/components/shared/pathologist-search'
import { formatDate } from '@/lib/utils'
import { Plus, UserCheck, X, Eye, Search, User } from 'lucide-react'
import type { LabOrder, LabResult, Patient, Doctor, Pathologist } from '@/types'

type Tab = 'all' | 'Pending' | 'Assigned' | 'Completed' | 'Cancelled'

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'সব' },
  { id: 'Pending', label: 'মুলতুবি' },
  { id: 'Assigned', label: 'নির্ধারিত' },
  { id: 'Completed', label: 'সম্পন্ন' },
  { id: 'Cancelled', label: 'বাতিল' },
]

const newOrderSchema = z.object({
  patient_id:     z.string().min(1, 'রোগী নির্বাচন করুন'),
  test_id:        z.string().min(1, 'পরীক্ষা নির্বাচন করুন'),
  doctor_id:      z.string().optional(),
  pathologist_id: z.string().optional(),
})

type NewOrderForm = z.infer<typeof newOrderSchema>

const assignSchema = z.object({
  pathologist_id: z.string().min(1, 'প্যাথলজিস্ট নির্বাচন করুন'),
})

type AssignForm = z.infer<typeof assignSchema>

// ── Patient Search ────────────────────────────────────────────────────────────
function PatientSearch({
  patients, selected, onSelect, onClear, error,
}: {
  patients: Patient[]
  selected: Patient | null
  onSelect: (p: Patient) => void
  onClear: () => void
  error?: string
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
        {open && query.length >= 2 && results.length === 0 && (
          <p className="mt-1.5 text-xs text-slate-400 pl-1">কোনো রোগী পাওয়া যায়নি</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function LabOrdersPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [activeTab,        setActiveTab]        = useState<Tab>('all')
  const [createOpen,       setCreateOpen]       = useState(false)
  const [assignOrder,      setAssignOrder]      = useState<LabOrder | null>(null)
  const [cancelId,         setCancelId]         = useState<string | null>(null)
  const [viewResult,       setViewResult]       = useState<LabResult | null>(null)
  const [selectedPatient,  setSelectedPatient]  = useState<Patient | null>(null)
  const [selectedDoctor,   setSelectedDoctor]   = useState<Doctor | null>(null)
  const [selectedPathologist, setSelectedPathologist] = useState<(Pathologist & { active_test_count?: number }) | null>(null)
  const [assignSelected, setAssignSelected] = useState<(Pathologist & { active_test_count?: number }) | null>(null)

  const { data: labOrders = [], isLoading } = useQuery({
    queryKey: ['lab-orders', hospitalId],
    queryFn: () => api.manager.getLabOrders(hospitalId),
  })

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.manager.getPatients(),
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['active-doctors', hospitalId],
    queryFn: () => api.manager.getDoctors(hospitalId),
  })

  const { data: labTests = [] } = useQuery({
    queryKey: ['manager-lab-tests', hospitalId],
    queryFn: () => api.manager.getLabTests(hospitalId),
  })

  const { data: pathologists = [] } = useQuery({
    queryKey: ['manager-pathologists', hospitalId],
    queryFn: () => api.manager.getPathologists(hospitalId),
  })

  const newOrderForm = useForm<NewOrderForm>({ resolver: zodResolver(newOrderSchema) })
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })

  const createMutation = useMutation({
    mutationFn: (data: NewOrderForm) => {
      const patient = patients.find(p => p.id === data.patient_id)!
      const test = labTests.find(t => t.id === data.test_id)!
      const doctor = data.doctor_id ? doctors.find(d => d.id === data.doctor_id) : null
      return api.manager.createLabOrder(hospitalId, {
        patient_id: data.patient_id,
        patient_name: patient.name,
        test_id: data.test_id,
        test_name: test.name,
        ordered_by_doctor_name: doctor?.name ?? '',
        ...(doctor ? { ordered_by_doctor_id: doctor.id } : {}),
        ...(data.pathologist_id ? { assigned_pathologist_id: data.pathologist_id } : {}),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-pathologists', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard', hospitalId] })
      closeCreateModal()
    },
  })

  const assignMutation = useMutation({
    mutationFn: (data: AssignForm) => {
      const p = pathologists.find(p => p.id === data.pathologist_id)!
      return api.manager.assignPathologist(assignOrder!.id, data.pathologist_id, p.name)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-pathologists', hospitalId] })
      setAssignOrder(null)
      setAssignSelected(null)
      assignForm.reset()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.manager.cancelLabOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders', hospitalId] })
      setCancelId(null)
    },
  })

  const closeCreateModal = () => {
    setCreateOpen(false)
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setSelectedPathologist(null)
    newOrderForm.reset()
  }

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p)
    newOrderForm.setValue('patient_id', p.id)
  }

  const handleDoctorSelect = (d: Doctor) => {
    setSelectedDoctor(d)
    newOrderForm.setValue('doctor_id', d.id)
  }

  const handleViewResult = async (orderId: string) => {
    const result = await api.manager.getLabResult(orderId)
    if (result) setViewResult(result)
  }

  const filtered = useMemo(
    () => activeTab === 'all' ? labOrders : labOrders.filter(lo => lo.status === activeTab),
    [labOrders, activeTab]
  )

  const remarkVariantMap: Record<string, 'green' | 'red' | 'amber'> = {
    'Normal': 'green',
    'Abnormal': 'red',
    'Follow-up required': 'amber',
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ল্যাব অর্ডার ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {labOrders.length}টি অর্ডার</p>
        </div>
        <Button onClick={() => { closeCreateModal(); setCreateOpen(true) }}>
          <Plus className="w-4 h-4" />
          নতুন অর্ডার
        </Button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="ml-1.5 text-xs text-slate-400">
                {labOrders.filter(lo => lo.status === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['রোগী', 'পরীক্ষা', 'ডাক্তার', 'প্যাথলজিস্ট', 'স্ট্যাটাস', 'কার্যক্রম']} />
          <TableBody isEmpty={filtered.length === 0} emptyMessage="কোনো অর্ডার নেই" colSpan={6}>
            {filtered.map((lo) => (
              <TableRow key={lo.id}>
                <TableCell><span className="font-medium">{lo.patient_name}</span></TableCell>
                <TableCell>{lo.test_name}</TableCell>
                <TableCell>{lo.ordered_by_doctor_name}</TableCell>
                <TableCell>
                  {lo.assigned_pathologist_name ? (
                    <span className="text-sm text-slate-700">{lo.assigned_pathologist_name}</span>
                  ) : (
                    <span className="text-xs text-slate-400">নির্ধারিত হয়নি</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={lo.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {lo.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => { assignForm.reset(); setAssignSelected(null); setAssignOrder(lo) }}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="প্যাথলজিস্ট নির্ধারণ করুন"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCancelId(lo.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="বাতিল করুন"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {lo.status === 'Completed' && (
                      <button
                        onClick={() => handleViewResult(lo.id)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                        title="ফলাফল দেখুন"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map((lo) => (
          <div key={lo.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{lo.patient_name}</p>
                <p className="text-sm text-slate-500">{lo.test_name}</p>
                <p className="text-xs text-slate-400 mt-1">ডাক্তার: {lo.ordered_by_doctor_name}</p>
                {lo.assigned_pathologist_name && (
                  <p className="text-xs text-slate-400">প্যাথলজিস্ট: {lo.assigned_pathologist_name}</p>
                )}
                <div className="mt-2">
                  <StatusBadge status={lo.status} />
                </div>
              </div>
              <div className="flex gap-1">
                {lo.status === 'Pending' && (
                  <>
                    <button onClick={() => { assignForm.reset(); setAssignOrder(lo) }} className="p-1.5 text-slate-400 hover:text-green-600">
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCancelId(lo.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {lo.status === 'Completed' && (
                  <button onClick={() => handleViewResult(lo.id)} className="p-1.5 text-slate-400 hover:text-teal-600">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Lab Order Modal */}
      <Modal
        isOpen={createOpen}
        onClose={closeCreateModal}
        title="নতুন ল্যাব অর্ডার"
        size="sm"
      >
        <form onSubmit={newOrderForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <PatientSearch
            patients={patients}
            selected={selectedPatient}
            onSelect={handlePatientSelect}
            onClear={() => { setSelectedPatient(null); newOrderForm.setValue('patient_id', '') }}
            error={newOrderForm.formState.errors.patient_id?.message}
          />
          <Select
            label="পরীক্ষা"
            error={newOrderForm.formState.errors.test_id?.message}
            options={labTests.filter(t => t.available).map(t => ({ value: t.id, label: `${t.name}${t.price ? ` — ৳${t.price}` : ''}` }))}
            placeholder={labTests.length === 0 ? 'কোনো পরীক্ষা নেই — Owner থেকে যোগ করুন' : 'পরীক্ষা নির্বাচন করুন'}
            {...newOrderForm.register('test_id')}
          />
          <DoctorSearch
            doctors={doctors}
            selected={selectedDoctor}
            onSelect={handleDoctorSelect}
            onClear={() => { setSelectedDoctor(null); newOrderForm.setValue('doctor_id', '') }}
            error={newOrderForm.formState.errors.doctor_id?.message}
            optional
          />
          <PathologistSearch
            pathologists={pathologists}
            selected={selectedPathologist}
            onSelect={(p) => { setSelectedPathologist(p); newOrderForm.setValue('pathologist_id', p.id) }}
            onClear={() => { setSelectedPathologist(null); newOrderForm.setValue('pathologist_id', '') }}
            optional
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeCreateModal}>বাতিল</Button>
            <Button type="submit" loading={createMutation.isPending}>অর্ডার করুন</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Pathologist Modal */}
      <Modal
        isOpen={!!assignOrder}
        onClose={() => { setAssignOrder(null); setAssignSelected(null); assignForm.reset() }}
        title="প্যাথলজিস্ট নির্ধারণ"
        size="sm"
      >
        {assignOrder && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
              <p><span className="font-medium">রোগী:</span> {assignOrder.patient_name}</p>
              <p><span className="font-medium">পরীক্ষা:</span> {assignOrder.test_name}</p>
            </div>
            <form onSubmit={assignForm.handleSubmit((d) => assignMutation.mutate(d))} className="space-y-4">
              <PathologistSearch
                pathologists={pathologists}
                selected={assignSelected}
                onSelect={(p) => { setAssignSelected(p); assignForm.setValue('pathologist_id', p.id) }}
                onClear={() => { setAssignSelected(null); assignForm.setValue('pathologist_id', '') }}
                error={assignForm.formState.errors.pathologist_id?.message}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setAssignOrder(null); setAssignSelected(null); assignForm.reset() }}>বাতিল</Button>
                <Button type="submit" loading={assignMutation.isPending}>নির্ধারণ করুন</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* View Result Modal */}
      <Modal
        isOpen={!!viewResult}
        onClose={() => setViewResult(null)}
        title="ল্যাব ফলাফল"
        size="sm"
      >
        {viewResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">মন্তব্য</span>
              <Badge variant={remarkVariantMap[viewResult.remarks]}>
                {viewResult.remarks === 'Normal' ? 'স্বাভাবিক'
                  : viewResult.remarks === 'Abnormal' ? 'অস্বাভাবিক'
                  : 'ফলো-আপ প্রয়োজন'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">ফলাফল</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{viewResult.findings}</p>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>জমা দিয়েছেন: {viewResult.submitted_by_name}</span>
              <span>{formatDate(viewResult.submitted_at)}</span>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" onClick={() => setViewResult(null)}>বন্ধ করুন</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        title="অর্ডার বাতিল করুন"
        message="আপনি কি এই ল্যাব অর্ডারটি বাতিল করতে চান?"
        tone="warning"
        confirmLabel="হ্যাঁ, বাতিল করুন"
        cancelLabel="না"
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}
