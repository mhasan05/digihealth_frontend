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
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react'
import type { Midwife } from '@/types'

const midwifeSchema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  phone: z.string().min(11, 'ফোন নম্বর দিন'),
  ward: z.string().min(2, 'ওয়ার্ড দিন'),
  status: z.enum(['Active', 'Inactive', 'On-leave']),
})

type MidwifeForm = z.infer<typeof midwifeSchema>

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

export default function MidwivesPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editRow, setEditRow] = useState<Midwife | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['midwives', hospitalId],
    queryFn: () => api.owner.getMidwives(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MidwifeForm>({
    resolver: zodResolver(midwifeSchema),
    defaultValues: { status: 'Active' },
  })

  const addMutation = useMutation({
    mutationFn: (data: MidwifeForm) => api.owner.addMidwife(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: MidwifeForm) => api.owner.updateMidwife(editRow!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })
      setModalOpen(false)
      setEditRow(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteMidwife(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })
      setDeleteId(null)
    },
  })

  const handleOpenAdd = () => {
    reset({ status: 'Active' })
    setEditRow(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (row: Midwife) => {
    reset({ name: row.name, phone: row.phone, ward: row.ward, status: row.status })
    setEditRow(row)
    setModalOpen(true)
  }

  const onSubmit = (data: MidwifeForm) => {
    if (editRow) updateMutation.mutate(data)
    else addMutation.mutate(data)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">মিডওয়াইফ ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">মোট {rows.length}জন মিডওয়াইফ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UserPlus className="w-4 h-4" />
            আবেদনকারী থেকে যুক্ত করুন
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            যোগ করুন
          </Button>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['নাম', 'ফোন', 'ওয়ার্ড', 'স্ট্যাটাস', 'যোগদান', 'কার্যক্রম']} />
          <TableBody isEmpty={rows.length === 0} emptyMessage="কোনো মিডওয়াইফ নেই" colSpan={6}>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><span className="font-medium">{r.name}</span></TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.ward}</TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[r.status]}>{statusLabelMap[r.status]}</Badge>
                </TableCell>
                <TableCell>{formatDate(r.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
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
        {rows.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{r.name}</p>
                <p className="text-sm text-slate-500">{r.phone} | ওয়ার্ড: {r.ward}</p>
                <div className="mt-2">
                  <Badge variant={statusVariantMap[r.status]}>{statusLabelMap[r.status]}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(r)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditRow(null); reset() }}
        title={editRow ? 'সম্পাদনা করুন' : 'মিডওয়াইফ যোগ করুন'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditRow(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editRow ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="মুছুন"
        message="আপনি কি এই মিডওয়াইফকে মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />

      <StaffImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        roleLabel="মিডওয়াইফ"
        queryKeyPrefix="midwife"
        search={api.owner.searchAvailableMidwives}
        doImport={api.owner.importMidwife}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })}
      />
    </div>
  )
}
