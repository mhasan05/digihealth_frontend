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
import { StaffImportModal } from '@/components/shared/staff-import-modal'
import { formatDate } from '@/lib/utils'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import type { Pathologist } from '@/types'

// Owners can only edit an already-imported pathologist's own-hospital fields
// (name/email/specialization/status/demographics) — phone and password are
// never accepted by PathologistDetailView.put(), so they're left out here.
const pathologistEditSchema = z.object({
  name:           z.string().min(2, 'নাম দিন'),
  email:          z.string().email('সঠিক ইমেইল দিন'),
  specialization: z.string().min(2, 'বিশেষজ্ঞতা দিন'),
  status:         z.enum(['Active', 'Inactive']),
  age:            z.coerce.number({ message: 'বয়স দিন' }).int().min(0).max(150),
  gender:         z.enum(['Male', 'Female', 'Other'], { message: 'লিঙ্গ নির্বাচন করুন' }),
  blood_group:    z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
  address:        z.string().min(1, 'ঠিকানা দিন'),
})

type PathologistEditForm = z.infer<typeof pathologistEditSchema>

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
  const [importOpen, setImportOpen] = useState(false)
  const [editPathologist, setEditPathologist] = useState<Pathologist | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: pathologists = [], isLoading } = useQuery({
    queryKey: ['pathologists', hospitalId],
    queryFn: () => api.owner.getPathologists(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PathologistEditForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pathologistEditSchema) as any,
  })

  const updateMutation = useMutation({
    mutationFn: (data: PathologistEditForm) => api.owner.updatePathologist(editPathologist!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })
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

  const handleOpenEdit = (p: Pathologist) => {
    reset({
      name: p.name, email: p.email,
      specialization: p.specialization, status: p.status,
      age:         p.age ?? 0,
      gender:      (p.gender as 'Male' | 'Female' | 'Other') ?? 'Male',
      blood_group: (p.blood_group as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') ?? '',
      address:     p.address ?? '',
    })
    setEditPathologist(p)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">প্যাথলজিস্ট ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {pathologists.length}জন প্যাথলজিস্ট</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UserPlus className="w-4 h-4" />
          আবেদনকারী থেকে যুক্ত করুন
        </Button>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        প্যাথলজিস্ট শুধু অ্যাডমিন-অনুমোদিত আবেদনকারীদের তালিকা থেকেই যুক্ত করা যায় — সরাসরি নতুন অ্যাকাউন্ট তৈরি করা যায় না।
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
        isOpen={!!editPathologist}
        onClose={() => { setEditPathologist(null); reset() }}
        title="প্যাথলজিস্ট সম্পাদনা"
        subtitle={editPathologist ? `ফোন: ${editPathologist.phone} (পরিবর্তনযোগ্য নয়)` : undefined}
        size="sm"
      >
        <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <Input label="নাম" error={errors.name?.message} {...register('name')} />
          <Input label="ইমেইল" type="email" error={errors.email?.message} {...register('email')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="বয়স" type="number" error={errors.age?.message} {...register('age')} />
            <Select label="লিঙ্গ" error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label="রক্তের গ্রুপ (ঐচ্ছিক)" error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label="ঠিকানা" error={errors.address?.message} {...register('address')} />
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
            <Button type="button" variant="ghost" onClick={() => { setEditPathologist(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              আপডেট করুন
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

      <StaffImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        roleLabel="প্যাথলজিস্ট"
        queryKeyPrefix="pathologist"
        extraFieldLabel="বিশেষজ্ঞতা (ঐচ্ছিক)"
        search={api.owner.searchAvailablePathologists}
        doImport={api.owner.importPathologist}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })}
      />
    </div>
  )
}
