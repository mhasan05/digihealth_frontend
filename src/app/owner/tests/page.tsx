"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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

export default function LabTestsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTest, setEditTest] = useState<LabTest | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const testSchema = useMemo(() => z.object({
    name: z.string().min(2, t('testPage.nameRequired')),
    price: z.coerce.number().min(1, t('testPage.priceRequired')),
    duration: z.string().min(1, t('testPage.durationRequired')),
    available: z.boolean().optional(),
  }), [t])

  type TestForm = z.output<typeof testSchema>

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

  const handleOpenEdit = (test: LabTest) => {
    reset({ name: test.name, price: test.price, duration: test.duration, available: test.available })
    setEditTest(test)
    setModalOpen(true)
  }

  const onSubmit = (data: TestForm) => {
    if (editTest) {
      updateMutation.mutate(data)
    } else {
      addMutation.mutate(data)
    }
  }

  const activeCount = tests.filter(test => test.available).length

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('testPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('testPage.totalCount', { total: tests.length, active: activeCount })}
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          {t('testPage.addTest')}
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[t('testPage.testName'), t('testPage.price'), t('testPage.duration'), t('testPage.available'), t('common.actions')]} />
          <TableBody isEmpty={tests.length === 0} emptyMessage={t('testPage.noTests')} colSpan={5}>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-500" />
                    <span className="font-medium">{test.name}</span>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(test.price)}</TableCell>
                <TableCell>{test.duration}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleMutation.mutate({ id: test.id, available: !test.available })}
                    className="flex items-center gap-1.5 text-sm"
                    title={t('testPage.toggleAvailability')}
                  >
                    {test.available ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                    <Badge variant={test.available ? 'green' : 'gray'}>
                      {test.available ? t('testPage.yes') : t('testPage.no')}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(test)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(test.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label={t('common.delete')}
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
        {tests.map((test) => (
          <div key={test.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-teal-500" />
                  <p className="font-semibold text-slate-900">{test.name}</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">{formatCurrency(test.price)} | {test.duration}</p>
                <button
                  onClick={() => toggleMutation.mutate({ id: test.id, available: !test.available })}
                  className="mt-2 flex items-center gap-1.5"
                >
                  {test.available ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <Badge variant={test.available ? 'green' : 'gray'}>
                    {test.available ? t('testPage.yes') : t('testPage.no')}
                  </Badge>
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(test)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(test.id)} className="p-1.5 text-slate-400 hover:text-red-600">
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
        title={editTest ? t('testPage.editTitle') : t('testPage.addTest')}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('testPage.testName')} error={errors.name?.message} {...register('name')} />
          <Input label={t('testPage.priceHint')} type="number" error={errors.price?.message} {...register('price')} />
          <Input label={t('testPage.durationHint')} error={errors.duration?.message} {...register('duration')} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="available" {...register('available')} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="available" className="text-sm text-slate-700 cursor-pointer">{t('testPage.available')}</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditTest(null); reset() }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editTest ? t('staffPage.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('testPage.deleteTitle')}
        message={t('testPage.deleteConfirm')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
