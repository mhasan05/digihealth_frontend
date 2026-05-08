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
import { Plus, Trash2 } from 'lucide-react'

const coOwnerSchema = z.object({
  name:        z.string().min(2, 'নাম দিন'),
  phone:       z.string().min(11, 'ফোন নম্বর দিন'),
  email:       z.string().email('সঠিক ইমেইল দিন'),
  password:    z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর'),
  age:         z.coerce.number({ message: 'বয়স দিন' }).int().min(0).max(150),
  gender:      z.enum(['Male', 'Female', 'Other'], { message: 'লিঙ্গ নির্বাচন করুন' }),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
  address:     z.string().min(1, 'ঠিকানা দিন'),
})

type CoOwnerForm = z.infer<typeof coOwnerSchema>

const GENDER_OPTIONS = [
  { value: 'Male',   label: 'পুরুষ'    },
  { value: 'Female', label: 'মহিলা'    },
  { value: 'Other',  label: 'অন্যান্য' },
]
const BLOOD_GROUP_OPTIONS = [
  { value: '', label: 'অজানা' },
  ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
]

export default function CoOwnersPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['co-owners', hospitalId],
    queryFn: () => api.owner.getCoOwners(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CoOwnerForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(coOwnerSchema) as any,
  })

  const addMutation = useMutation({
    mutationFn: (data: CoOwnerForm) => api.owner.addCoOwner(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-owners', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.removeCoOwner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-owners', hospitalId] })
      setDeleteId(null)
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">সহ-মালিক ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {owners.length}জন সহ-মালিক</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true) }}>
          <Plus className="w-4 h-4" />
          সহ-মালিক যোগ করুন
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'ফোন', 'ইমেইল', 'প্রাথমিক', 'যোগদান', 'কার্যক্রম']} />
          <TableBody isEmpty={owners.length === 0} emptyMessage="কোনো সহ-মালিক নেই" colSpan={6}>
            {owners.map((o) => (
              <TableRow key={o.id}>
                <TableCell><span className="font-medium">{o.name}</span></TableCell>
                <TableCell>{o.phone}</TableCell>
                <TableCell>{o.email}</TableCell>
                <TableCell>
                  {o.is_primary ? <Badge variant="blue">প্রাথমিক</Badge> : <Badge variant="gray">সহ-মালিক</Badge>}
                </TableCell>
                <TableCell>{formatDate(o.created_at)}</TableCell>
                <TableCell>
                  {!o.is_primary && (
                    <button
                      onClick={() => setDeleteId(o.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {owners.map((o) => (
          <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{o.name}</p>
                <p className="text-sm text-slate-500">{o.phone} | {o.email}</p>
                <div className="mt-2">
                  {o.is_primary ? <Badge variant="blue">প্রাথমিক</Badge> : <Badge variant="gray">সহ-মালিক</Badge>}
                </div>
              </div>
              {!o.is_primary && (
                <button onClick={() => setDeleteId(o.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="সহ-মালিক যোগ করুন" size="sm">
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
          <Input label="নাম" error={errors.name?.message} {...register('name')} />
          <Input label="ফোন নম্বর" error={errors.phone?.message} {...register('phone')} />
          <Input label="ইমেইল" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="পাসওয়ার্ড" type="password" error={errors.password?.message} {...register('password')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="বয়স" type="number" error={errors.age?.message} {...register('age')} />
            <Select label="লিঙ্গ" error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label="রক্তের গ্রুপ (ঐচ্ছিক)" error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label="ঠিকানা" error={errors.address?.message} {...register('address')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); reset() }}>বাতিল</Button>
            <Button type="submit" loading={addMutation.isPending}>যোগ করুন</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="সহ-মালিক মুছুন"
        message="আপনি কি এই সহ-মালিককে মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
