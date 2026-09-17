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
import { StaffImportModal } from '@/components/shared/staff-import-modal'
import { formatDate } from '@/lib/utils'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import type { Midwife } from '@/types'

export default function MidwivesPage() {
  const { t } = useTranslation()
  const roleLabel = t('roleApplicationType.midwife')
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [editRow, setEditRow] = useState<Midwife | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const midwifeSchema = useMemo(() => z.object({
    name: z.string().min(2, t('settings.nameRequired')),
    phone: z.string().min(11, t('auth.validPhone')),
    ward: z.string().min(2, t('staffPage.wardRequired')),
    status: z.enum(['Active', 'Inactive', 'On-leave']),
  }), [t])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['midwives', hospitalId],
    queryFn: () => api.owner.getMidwives(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof midwifeSchema>>({
    resolver: zodResolver(midwifeSchema),
    defaultValues: { status: 'Active' },
  })

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof midwifeSchema>) => api.owner.updateMidwife(editRow!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })
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

  const handleOpenEdit = (row: Midwife) => {
    reset({ name: row.name, phone: row.phone, ward: row.ward, status: row.status })
    setEditRow(row)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('staffPage.title', { role: roleLabel })}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('staffPage.totalCount', { count: rows.length, role: roleLabel })}</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UserPlus className="w-4 h-4" />
          {t('staffPage.addFromApplicants')}
        </Button>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        {t('staffPage.onlyFromApplicantsHint', { role: roleLabel })}
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[t('common.name'), t('common.phone'), t('admission.ward'), t('common.status'), t('staffPage.joined'), t('common.actions')]} />
          <TableBody isEmpty={rows.length === 0} emptyMessage={t('staffPage.noStaff', { role: roleLabel })} colSpan={6}>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><span className="font-medium">{r.name}</span></TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.ward}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>{formatDate(r.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
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
        {rows.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{r.name}</p>
                <p className="text-sm text-slate-500">{r.phone} | {t('admission.ward')}: {r.ward}</p>
                <div className="mt-2">
                  <StatusBadge status={r.status} />
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
        isOpen={!!editRow}
        onClose={() => { setEditRow(null); reset() }}
        title={t('staffPage.editTitle', { role: roleLabel })}
        size="sm"
      >
        <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <Input label={t('common.name')} error={errors.name?.message} {...register('name')} />
          <Input label={t('common.phone')} error={errors.phone?.message} {...register('phone')} />
          <Input label={t('admission.ward')} error={errors.ward?.message} {...register('ward')} />
          <Select
            label={t('common.status')}
            error={errors.status?.message}
            options={[
              { value: 'Active', label: t('status.active') },
              { value: 'Inactive', label: t('status.inactive') },
              { value: 'On-leave', label: t('status.onLeave') },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setEditRow(null); reset() }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              {t('staffPage.update')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('staffPage.deleteTitle', { role: roleLabel })}
        message={t('staffPage.deleteConfirm', { role: roleLabel })}
        isLoading={deleteMutation.isPending}
      />

      <StaffImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        roleLabel={roleLabel}
        queryKeyPrefix="midwife"
        search={api.owner.searchAvailableMidwives}
        doImport={api.owner.importMidwife}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['midwives', hospitalId] })}
      />
    </div>
  )
}
