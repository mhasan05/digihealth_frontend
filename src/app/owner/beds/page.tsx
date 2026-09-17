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
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, BedDouble } from 'lucide-react'
import type { Bed } from '@/types'

export default function BedsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editBed, setEditBed] = useState<Bed | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const bedSchema = useMemo(() => z.object({
    number: z.string().min(1, t('bedPage.bedNumberRequired')),
    ward: z.string().min(2, t('staffPage.wardRequired')),
    type: z.enum(['General', 'ICU', 'Private', 'Cabin']),
    price_per_day: z.coerce.number().min(1, t('bedPage.priceRequired')),
    status: z.enum(['Available', 'Occupied']),
  }), [t])

  type BedForm = z.output<typeof bedSchema>

  const typeLabelMap: Record<string, string> = {
    General: t('bedPage.typeGeneral'),
    ICU: t('bedPage.typeIcu'),
    Private: t('bedPage.typePrivate'),
    Cabin: t('bedPage.typeCabin'),
  }

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ['beds', hospitalId],
    queryFn: () => api.owner.getBeds(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BedForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bedSchema) as any,
    defaultValues: { type: 'General', status: 'Available' },
  })

  const addMutation = useMutation({
    mutationFn: (data: BedForm) => api.owner.addBed(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: BedForm) => api.owner.updateBed(editBed!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', hospitalId] })
      setModalOpen(false)
      setEditBed(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteBed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', hospitalId] })
      setDeleteId(null)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      setDeleteId(null)
    },
  })

  const handleOpenAdd = () => {
    reset({ type: 'General', status: 'Available' })
    setEditBed(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (b: Bed) => {
    reset({ number: b.number, ward: b.ward, type: b.type, price_per_day: b.price_per_day, status: b.status })
    setEditBed(b)
    setModalOpen(true)
  }

  const onSubmit = (data: BedForm) => {
    if (editBed) {
      updateMutation.mutate(data)
    } else {
      addMutation.mutate(data)
    }
  }

  const { available, occupied } = useMemo(() => {
    let available = 0, occupied = 0
    for (const b of beds) {
      if (b.status === 'Available') available++
      else if (b.status === 'Occupied') occupied++
    }
    return { available, occupied }
  }, [beds])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('bedPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('bedPage.summary', { total: beds.length, available, occupied })}
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          {t('bedPage.addBed')}
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex justify-between items-center">
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700 ml-2">✕</button>
        </div>
      )}

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[t('bedPage.bedNumber'), t('admission.ward'), t('bedPage.bedType'), t('bedPage.pricePerDay'), t('common.status'), t('common.actions')]} />
          <TableBody isEmpty={beds.length === 0} emptyMessage={t('bedPage.noBeds')} colSpan={6}>
            {beds.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{b.number}</span>
                  </div>
                </TableCell>
                <TableCell>{b.ward}</TableCell>
                <TableCell>{typeLabelMap[b.type]}</TableCell>
                <TableCell>{formatCurrency(b.price_per_day)}</TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {b.status !== 'Occupied' && (
                      <button
                        onClick={() => setDeleteId(b.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
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
        {beds.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-slate-500" />
                  <p className="font-semibold text-slate-900">{t('bedPage.bedPrefix')} {b.number}</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">{b.ward} | {typeLabelMap[b.type]} | {formatCurrency(b.price_per_day)}{t('bedPage.perDay')}</p>
                <div className="mt-2 flex gap-2">
                  <StatusBadge status={b.status} />
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(b)} className="p-1.5 text-slate-400 hover:text-green-600">
                  <Pencil className="w-4 h-4" />
                </button>
                {b.status !== 'Occupied' && (
                  <button onClick={() => setDeleteId(b.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditBed(null); reset() }}
        title={editBed ? t('bedPage.editTitle') : t('bedPage.addBed')}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('bedPage.bedNumber')} error={errors.number?.message} {...register('number')} />
          <Input label={t('admission.ward')} error={errors.ward?.message} {...register('ward')} />
          <Select
            label={t('bedPage.bedType')}
            error={errors.type?.message}
            options={[
              { value: 'General', label: t('bedPage.typeGeneral') },
              { value: 'ICU', label: t('bedPage.typeIcu') },
              { value: 'Private', label: t('bedPage.typePrivate') },
              { value: 'Cabin', label: t('bedPage.typeCabin') },
            ]}
            {...register('type')}
          />
          <Input label={t('bedPage.pricePerDay')} type="number" error={errors.price_per_day?.message} {...register('price_per_day')} />
          <Select
            label={t('common.status')}
            error={errors.status?.message}
            options={[
              { value: 'Available', label: t('status.available') },
              { value: 'Occupied', label: t('status.occupied') },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditBed(null); reset() }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editBed ? t('staffPage.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('bedPage.deleteTitle')}
        message={t('bedPage.deleteConfirm')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
