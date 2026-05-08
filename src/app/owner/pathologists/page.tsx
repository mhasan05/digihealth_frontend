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
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import type { Pathologist } from '@/types'

const pathologistSchema = z.object({
  name:           z.string().min(2, 'নাম দিন'),
  phone:          z.string().min(11, 'ফোন নম্বর দিন'),
  email:          z.string().email('সঠিক ইমেইল দিন'),
  password:       z.string().optional(),
  specialization: z.string().min(2, 'বিশেষজ্ঞতা দিন'),
  status:         z.enum(['Active', 'Inactive']),
  age:            z.coerce.number({ message: 'বয়স দিন' }).int().min(0).max(150),
  gender:         z.enum(['Male', 'Female', 'Other'], { message: 'লিঙ্গ নির্বাচন করুন' }),
  blood_group:    z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
  address:        z.string().min(1, 'ঠিকানা দিন'),
})

type PathologistForm = z.infer<typeof pathologistSchema>

const GENDER_OPTIONS = [
  { value: 'Male',   label: 'পুরুষ'    },
  { value: 'Female', label: 'মহিলা'    },
  { value: 'Other',  label: 'অন্যান্য' },
]
const BLOOD_GROUP_OPTIONS = [
  { value: '', label: 'অজানা' },
  ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
]

export default function PathologistsPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editPathologist, setEditPathologist] = useState<Pathologist | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: pathologists = [], isLoading } = useQuery({
    queryKey: ['pathologists', hospitalId],
    queryFn: () => api.owner.getPathologists(hospitalId),
  })

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PathologistForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pathologistSchema) as any,
    defaultValues: { status: 'Active' },
  })

  const addMutation = useMutation({
    mutationFn: (data: PathologistForm) => api.owner.addPathologist(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: PathologistForm) => api.owner.updatePathologist(editPathologist!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })
      setModalOpen(false)
      setEditPathologist(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deletePathologist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })
      setDeleteId(null)
    },
  })

  const handleOpenAdd = () => {
    reset({ status: 'Active', password: '' })
    setEditPathologist(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (p: Pathologist) => {
    reset({
      name: p.name, phone: p.phone, email: p.email,
      specialization: p.specialization, status: p.status, password: '',
      age:         p.age ?? 0,
      gender:      (p.gender as 'Male' | 'Female' | 'Other') ?? 'Male',
      blood_group: (p.blood_group as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') ?? 'A+',
      address:     p.address ?? '',
    })
    setEditPathologist(p)
    setModalOpen(true)
  }

  const onSubmit = (data: PathologistForm) => {
    if (!editPathologist) {
      if (!data.password || data.password.length < 6) {
        setError('password', { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' })
        return
      }
    } else if (data.password && data.password.length < 6) {
      setError('password', { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' })
      return
    }
    if (editPathologist) {
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
          <h2 className="text-xl font-bold text-slate-900">প্যাথলজিস্ট ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {pathologists.length}জন প্যাথলজিস্ট</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          প্যাথলজিস্ট যোগ করুন
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'ফোন', 'বিশেষজ্ঞতা', 'স্ট্যাটাস', 'যোগদান', 'কার্যক্রম']} />
          <TableBody isEmpty={pathologists.length === 0} emptyMessage="কোনো প্যাথলজিস্ট নেই" colSpan={6}>
            {pathologists.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </div>
                </TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.specialization}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'Active' ? 'green' : 'gray'}>
                    {p.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
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
        {pathologists.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.phone} | {p.specialization}</p>
                <div className="mt-2">
                  <Badge variant={p.status === 'Active' ? 'green' : 'gray'}>
                    {p.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditPathologist(null); reset() }}
        title={editPathologist ? 'প্যাথলজিস্ট সম্পাদনা' : 'প্যাথলজিস্ট যোগ করুন'}
        subtitle={!editPathologist ? 'নতুন প্যাথলজিস্ট তৈরি হলে তিনি ফোন নম্বর ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন' : 'পাসওয়ার্ড পরিবর্তন করতে চাইলে নতুন পাসওয়ার্ড দিন, অন্যথায় খালি রাখুন'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="নাম" error={errors.name?.message} {...register('name')} />
          <Input label="ফোন নম্বর" error={errors.phone?.message} {...register('phone')} />
          <Input label="ইমেইল" type="email" error={errors.email?.message} {...register('email')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="বয়স" type="number" error={errors.age?.message} {...register('age')} />
            <Select label="লিঙ্গ" error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label="রক্তের গ্রুপ (ঐচ্ছিক)" error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label="ঠিকানা" error={errors.address?.message} {...register('address')} />
          </div>

          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-700">লগইন তথ্য</p>
            </div>
            <Input
              label="পাসওয়ার্ড"
              type="password"
              placeholder={editPathologist ? 'নতুন পাসওয়ার্ড (খালি রাখলে পরিবর্তন হবে না)' : 'কমপক্ষে ৬ অক্ষর'}
              hint={editPathologist ? undefined : 'প্যাথলজিস্ট এই পাসওয়ার্ড দিয়ে লগইন করবেন'}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Input label="বিশেষজ্ঞতা" error={errors.specialization?.message} {...register('specialization')} />
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
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditPathologist(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editPathologist ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="প্যাথলজিস্ট মুছুন"
        message="আপনি কি এই প্যাথলজিস্টকে মুছে ফেলতে চান? তার লগইন অ্যাক্সেসও বাতিল হয়ে যাবে।"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
