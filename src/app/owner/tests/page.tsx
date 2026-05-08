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
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, FlaskConical, ToggleLeft, ToggleRight } from 'lucide-react'
import type { LabTest } from '@/types'

const testSchema = z.object({
  name: z.string().min(2, 'পরীক্ষার নাম দিন'),
  price: z.coerce.number().min(1, 'মূল্য দিন'),
  duration: z.string().min(1, 'সময়কাল দিন'),
  available: z.boolean().optional(),
})

type TestForm = z.output<typeof testSchema>

export default function LabTestsPage() {
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTest, setEditTest] = useState<LabTest | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['lab-tests', hospitalId],
    queryFn: () => api.owner.getLabTests(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TestForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(testSchema) as any,
    defaultValues: { available: true },
  })

  const addMutation = useMutation({
    mutationFn: (data: TestForm) => api.owner.addLabTest(hospitalId, { ...data, available: data.available ?? true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: TestForm) => api.owner.updateLabTest(editTest!.id, { ...data, available: data.available ?? true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests', hospitalId] })
      setModalOpen(false)
      setEditTest(null)
      reset()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.owner.updateLabTest(id, { available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lab-tests', hospitalId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteLabTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-tests', hospitalId] })
      setDeleteId(null)
    },
  })

  const handleOpenAdd = () => {
    reset({ available: true })
    setEditTest(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (t: LabTest) => {
    reset({ name: t.name, price: t.price, duration: t.duration, available: t.available })
    setEditTest(t)
    setModalOpen(true)
  }

  const onSubmit = (data: TestForm) => {
    if (editTest) {
      updateMutation.mutate(data)
    } else {
      addMutation.mutate(data)
    }
  }

  const activeCount = tests.filter(t => t.available).length

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ল্যাব পরীক্ষা ব্যবস্থাপনা</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            মোট {tests.length}টি পরীক্ষা — সক্রিয় {activeCount}টি
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          পরীক্ষা যোগ করুন
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['পরীক্ষার নাম', 'মূল্য', 'সময়কাল', 'উপলব্ধ', 'কার্যক্রম']} />
          <TableBody isEmpty={tests.length === 0} emptyMessage="কোনো পরীক্ষা নেই" colSpan={5}>
            {tests.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-500" />
                    <span className="font-medium">{t.name}</span>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(t.price)}</TableCell>
                <TableCell>{t.duration}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleMutation.mutate({ id: t.id, available: !t.available })}
                    className="flex items-center gap-1.5 text-sm"
                    title="উপলব্ধতা পরিবর্তন করুন"
                  >
                    {t.available ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                    <Badge variant={t.available ? 'green' : 'gray'}>
                      {t.available ? 'হ্যাঁ' : 'না'}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(t.id)}
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
        {tests.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-teal-500" />
                  <p className="font-semibold text-slate-900">{t.name}</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">{formatCurrency(t.price)} | {t.duration}</p>
                <button
                  onClick={() => toggleMutation.mutate({ id: t.id, available: !t.available })}
                  className="mt-2 flex items-center gap-1.5"
                >
                  {t.available ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <Badge variant={t.available ? 'green' : 'gray'}>
                    {t.available ? 'উপলব্ধ' : 'অনুপলব্ধ'}
                  </Badge>
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(t)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTest(null); reset() }}
        title={editTest ? 'পরীক্ষা সম্পাদনা' : 'পরীক্ষা যোগ করুন'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="পরীক্ষার নাম" error={errors.name?.message} {...register('name')} />
          <Input label="মূল্য (টাকা)" type="number" error={errors.price?.message} {...register('price')} />
          <Input label="সময়কাল (যেমন: ২৪ ঘণ্টা)" error={errors.duration?.message} {...register('duration')} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="available" {...register('available')} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="available" className="text-sm text-slate-700 cursor-pointer">উপলব্ধ</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditTest(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editTest ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="পরীক্ষা মুছুন"
        message="আপনি কি এই পরীক্ষাটি মুছে ফেলতে চান?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
