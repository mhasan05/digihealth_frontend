"use client"

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Doctor } from '@/types'

const doctorSchema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  phone: z.string().min(11, 'ফোন নম্বর দিন'),
  specialization: z.string().min(2, 'বিশেষজ্ঞতা দিন'),
  schedule: z.string().min(2, 'সময়সূচি দিন'),
  status: z.enum(['Active', 'Inactive']),
})

type DoctorForm = z.infer<typeof doctorSchema>

export default function DoctorsPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', hospitalId],
    queryFn: () => api.owner.getDoctors(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { status: 'Active' },
  })

  const addMutation = useMutation({
    mutationFn: (data: DoctorForm) => api.owner.addDoctor(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: DoctorForm) => api.owner.updateDoctor(editDoctor!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      setModalOpen(false)
      setEditDoctor(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      setDeleteId(null)
    },
  })

  const handleOpenAdd = () => {
    reset({ status: 'Active' })
    setEditDoctor(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (d: Doctor) => {
    reset({ name: d.name, phone: d.phone, specialization: d.specialization, schedule: d.schedule, status: d.status })
    setEditDoctor(d)
    setModalOpen(true)
  }

  const onSubmit = (data: DoctorForm) => {
    if (editDoctor) {
      updateMutation.mutate(data)
    } else {
      addMutation.mutate(data)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ডাক্তার ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {doctors.length}জন ডাক্তার</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          ডাক্তার যোগ করুন
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'বিশেষজ্ঞতা', 'ফোন', 'সময়সূচি', 'স্ট্যাটাস', 'কার্যক্রম']} />
          <TableBody isEmpty={doctors.length === 0} emptyMessage="কোনো ডাক্তার নেই" colSpan={6}>
            {doctors.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-slate-400">{formatDate(d.created_at)}</p>
                  </div>
                </TableCell>
                <TableCell>{d.specialization}</TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600 max-w-[180px] truncate block">{d.schedule}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={d.status === 'Active' ? 'green' : 'gray'}>
                    {d.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(d.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {doctors.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{d.name}</p>
                <p className="text-sm text-slate-500">{d.specialization} | {d.phone}</p>
                <p className="text-xs text-slate-400 mt-1">{d.schedule}</p>
                <div className="mt-2">
                  <Badge variant={d.status === 'Active' ? 'green' : 'gray'}>
                    {d.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(d)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditDoctor(null); reset() }}
        title={editDoctor ? 'ডাক্তার সম্পাদনা' : 'ডাক্তার যোগ করুন'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="নাম" error={errors.name?.message} {...register('name')} />
          <Input label="ফোন নম্বর" error={errors.phone?.message} {...register('phone')} />
          <Input label="বিশেষজ্ঞতা" error={errors.specialization?.message} {...register('specialization')} />
          <Input
            label="সময়সূচি (যেমন: শনি-বৃহঃ, ৯টা-৫টা)"
            error={errors.schedule?.message}
            {...register('schedule')}
          />
          <Select
            label="স্ট্যাটাস"
            error={errors.status?.message}
            options={[
              { value: 'Active', label: 'সক্রিয়' },
              { value: 'Inactive', label: 'নিষ্ক্রিয়' },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditDoctor(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editDoctor ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="ডাক্তার মুছুন"
        message="আপনি কি এই ডাক্তারকে মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
