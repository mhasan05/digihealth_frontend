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
import type { Nurse } from '@/types'

const nurseSchema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  phone: z.string().min(11, 'ফোন নম্বর দিন'),
  ward: z.string().min(2, 'ওয়ার্ড দিন'),
  status: z.enum(['Active', 'Inactive', 'On-leave']),
})

type NurseForm = z.infer<typeof nurseSchema>

const statusVariantMap: Record<string, 'green' | 'gray' | 'amber'> = {
  Active: 'green',
  Inactive: 'gray',
  'On-leave': 'amber',
}

const statusLabelMap: Record<string, string> = {
  Active: 'সক্রিয়',
  Inactive: 'নিষ্ক্রিয়',
  'On-leave': 'ছুটিতে',
}

export default function NursesPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [editNurse, setEditNurse] = useState<Nurse | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ['nurses', hospitalId],
    queryFn: () => api.owner.getNurses(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NurseForm>({
    resolver: zodResolver(nurseSchema),
    defaultValues: { status: 'Active' },
  })

  const updateMutation = useMutation({
    mutationFn: (data: NurseForm) => api.owner.updateNurse(editNurse!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurses', hospitalId] })
      setEditNurse(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteNurse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurses', hospitalId] })
      setDeleteId(null)
    },
  })

  const handleOpenEdit = (n: Nurse) => {
    reset({ name: n.name, phone: n.phone, ward: n.ward, status: n.status })
    setEditNurse(n)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">নার্স ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {nurses.length}জন নার্স</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UserPlus className="w-4 h-4" />
          আবেদনকারী থেকে যুক্ত করুন
        </Button>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        নার্স শুধু অ্যাডমিন-অনুমোদিত আবেদনকারীদের তালিকা থেকেই যুক্ত করা যায় — সরাসরি নতুন নার্স তৈরি করা যায় না।
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'ফোন', 'ওয়ার্ড', 'স্ট্যাটাস', 'যোগদান', 'কার্যক্রম']} />
          <TableBody isEmpty={nurses.length === 0} emptyMessage="কোনো নার্স নেই" colSpan={6}>
            {nurses.map((n) => (
              <TableRow key={n.id}>
                <TableCell><span className="font-medium">{n.name}</span></TableCell>
                <TableCell>{n.phone}</TableCell>
                <TableCell>{n.ward}</TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[n.status]}>{statusLabelMap[n.status]}</Badge>
                </TableCell>
                <TableCell>{formatDate(n.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(n)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(n.id)}
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
        {nurses.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{n.name}</p>
                <p className="text-sm text-slate-500">{n.phone} | ওয়ার্ড: {n.ward}</p>
                <div className="mt-2">
                  <Badge variant={statusVariantMap[n.status]}>{statusLabelMap[n.status]}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(n)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(n.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!editNurse}
        onClose={() => { setEditNurse(null); reset() }}
        title="নার্স সম্পাদনা"
        size="sm"
      >
        <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <Input label="নাম" error={errors.name?.message} {...register('name')} />
          <Input label="ফোন নম্বর" error={errors.phone?.message} {...register('phone')} />
          <Input label="ওয়ার্ড" error={errors.ward?.message} {...register('ward')} />
          <Select
            label="স্ট্যাটাস"
            error={errors.status?.message}
            options={[
              { value: 'Active', label: 'সক্রিয়' },
              { value: 'Inactive', label: 'নিষ্ক্রিয়' },
              { value: 'On-leave', label: 'ছুটিতে' },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setEditNurse(null); reset() }}>
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
        title="নার্স মুছুন"
        message="আপনি কি এই নার্সকে মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />

      <StaffImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        roleLabel="নার্স"
        queryKeyPrefix="nurse"
        search={api.owner.searchAvailableNurses}
        doImport={api.owner.importNurse}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['nurses', hospitalId] })}
      />
    </div>
  )
}
