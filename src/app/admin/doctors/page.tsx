"use client"

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Search, Stethoscope, AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react'
import type { RegistryDoctor } from '@/types'

const doctorSchema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  phone: z.string().min(11, 'ফোন নম্বর দিন'),
  bmdc_registration_no: z.string().optional(),
  specialization: z.string().min(2, 'বিশেষজ্ঞতা দিন'),
})

type DoctorForm = z.infer<typeof doctorSchema>

export default function AdminDoctorsPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<RegistryDoctor | null>(null)
  const [deleteDoctor, setDeleteDoctor] = useState<RegistryDoctor | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => api.admin.getDoctors(),
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return doctors
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      (d.bmdc_registration_no ?? '').toLowerCase().includes(q) ||
      (d.specialization ?? '').toLowerCase().includes(q),
    )
  }, [doctors, query])

  const form = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { name: '', phone: '', bmdc_registration_no: '', specialization: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: DoctorForm) =>
      api.admin.createDoctor({
        name: data.name,
        phone: data.phone,
        bmdc_registration_no: data.bmdc_registration_no?.trim() || undefined,
        specialization: data.specialization,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
      closeModal()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: DoctorForm) =>
      api.admin.updateDoctor(editDoctor!.id, {
        name: data.name,
        phone: data.phone,
        bmdc_registration_no: data.bmdc_registration_no?.trim() || '',
        specialization: data.specialization,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
      closeModal()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
      setDeleteDoctor(null)
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'Available' | 'Unavailable' }) =>
      api.admin.setDoctorAvailability(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-doctors'] }),
  })

  const openAdd = () => {
    setEditDoctor(null)
    form.reset({ name: '', phone: '', bmdc_registration_no: '', specialization: '' })
    setErrorMsg(null)
    setModalOpen(true)
  }

  const openEdit = (d: RegistryDoctor) => {
    setEditDoctor(d)
    form.reset({
      name: d.name,
      phone: d.phone,
      bmdc_registration_no: d.bmdc_registration_no ?? '',
      specialization: d.specialization ?? '',
    })
    setErrorMsg(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditDoctor(null)
    setErrorMsg(null)
    form.reset()
  }

  const onSubmit = (data: DoctorForm) => {
    setErrorMsg(null)
    if (editDoctor) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ডাক্তার রেজিস্ট্রি</h2>
          <p className="text-sm text-slate-500 mt-0.5">সিস্টেম-ব্যাপী ডাক্তারের তালিকা · মোট {doctors.length}জন</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          নতুন ডাক্তার যোগ করুন
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="নাম, ফোন, BMDC বা বিশেষজ্ঞতা দিয়ে খুঁজুন..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
        />
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'বিশেষজ্ঞতা', 'ফোন', 'BMDC রেজি. নং', 'স্ট্যাটাস', 'যুক্ত হাসপাতাল', 'যোগ করা হয়েছে', 'কার্যক্রম']} />
          <TableBody isEmpty={filtered.length === 0} emptyMessage="কোনো ডাক্তার নেই" colSpan={8}>
            {filtered.map(d => {
              const unavailable = d.availability_status === 'Unavailable'
              const next = unavailable ? 'Available' : 'Unavailable'
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {d.specialization
                      ? <span className="text-sm text-slate-700">{d.specialization}</span>
                      : <span className="text-xs text-slate-400">নেই</span>}
                  </TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>
                    {d.bmdc_registration_no
                      ? <span className="font-mono text-xs text-slate-700">{d.bmdc_registration_no}</span>
                      : <span className="text-xs text-slate-400">নেই</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={unavailable ? 'red' : 'green'}>
                      {unavailable ? 'অপ্রাপ্য' : 'প্রাপ্য'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">{d.attached_hospital_count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{formatDate(d.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => availabilityMutation.mutate({ id: d.id, next })}
                        disabled={availabilityMutation.isPending}
                        className={`p-1.5 rounded transition-colors ${
                          unavailable
                            ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        aria-label={unavailable ? 'প্রাপ্য হিসেবে চিহ্নিত করুন' : 'অপ্রাপ্য হিসেবে চিহ্নিত করুন'}
                        title={unavailable ? 'প্রাপ্য করুন' : 'অপ্রাপ্য করুন'}
                      >
                        {unavailable ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(d)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        aria-label="সম্পাদনা">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteDoctor(d)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="মুছুন">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map(d => {
          const unavailable = d.availability_status === 'Unavailable'
          const next = unavailable ? 'Available' : 'Unavailable'
          return (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  {d.specialization && (
                    <p className="text-sm text-slate-600">{d.specialization}</p>
                  )}
                  <p className="text-sm text-slate-500">{d.phone}</p>
                  {d.bmdc_registration_no && (
                    <p className="text-xs font-mono text-slate-500 mt-1">BMDC: {d.bmdc_registration_no}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">যুক্ত: {d.attached_hospital_count ?? 0} হাসপাতাল</p>
                  <div className="mt-2">
                    <Badge variant={unavailable ? 'red' : 'green'}>
                      {unavailable ? 'অপ্রাপ্য' : 'প্রাপ্য'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => availabilityMutation.mutate({ id: d.id, next })}
                    disabled={availabilityMutation.isPending}
                    className={`p-1.5 ${unavailable ? 'text-slate-400 hover:text-green-600' : 'text-slate-400 hover:text-amber-600'}`}
                    aria-label={unavailable ? 'প্রাপ্য করুন' : 'অপ্রাপ্য করুন'}
                  >
                    {unavailable ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-green-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteDoctor(d)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editDoctor ? 'ডাক্তার সম্পাদনা' : 'নতুন ডাক্তার যোগ করুন'}
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input label="পূর্ণ নাম" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input label="ফোন নম্বর" error={form.formState.errors.phone?.message} {...form.register('phone')} />
          <Input
            label="BMDC রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)"
            placeholder="যেমন: A-12345"
            error={form.formState.errors.bmdc_registration_no?.message}
            {...form.register('bmdc_registration_no')}
          />
          <Input
            label="বিশেষজ্ঞতা"
            placeholder="যেমন: Cardiology, Pediatrics"
            error={form.formState.errors.specialization?.message}
            {...form.register('specialization')}
          />
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>বাতিল</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editDoctor ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDoctor}
        onClose={() => setDeleteDoctor(null)}
        onConfirm={() => deleteDoctor && deleteMutation.mutate(deleteDoctor.id)}
        title="ডাক্তার মুছুন"
        message={
          deleteDoctor && (deleteDoctor.attached_hospital_count ?? 0) > 0
            ? `এই ডাক্তার ${deleteDoctor.attached_hospital_count}টি হাসপাতালে যুক্ত আছে। মুছলে সব যুক্ততাও বাতিল হবে।`
            : 'আপনি কি এই ডাক্তারকে রেজিস্ট্রি থেকে মুছে ফেলতে চান?'
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
