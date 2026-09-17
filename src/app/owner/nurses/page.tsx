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
import type { Nurse } from '@/types'

export default function NursesPage() {
  const { t } = useTranslation()
  const roleLabel = t('roleApplicationType.nurse')
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [editNurse, setEditNurse] = useState<Nurse | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const nurseSchema = useMemo(() => z.object({
    name: z.string().min(2, t('settings.nameRequired')),
    phone: z.string().min(11, t('auth.validPhone')),
    ward: z.string().min(2, t('staffPage.wardRequired')),
    status: z.enum(['Active', 'Inactive', 'On-leave']),
  }), [t])

  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ['nurses', hospitalId],
    queryFn: () => api.owner.getNurses(hospitalId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof nurseSchema>>({
    resolver: zodResolver(nurseSchema),
    defaultValues: { status: 'Active' },
  })

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof nurseSchema>) => api.owner.updateNurse(editNurse!.id, data),
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
          <h2 className="text-xl font-bold text-slate-900">{t('staffPage.title', { role: roleLabel })}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('staffPage.totalCount', { count: nurses.length, role: roleLabel })}</p>
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
          <TableBody isEmpty={nurses.length === 0} emptyMessage={t('staffPage.noStaff', { role: roleLabel })} colSpan={6}>
            {nurses.map((n) => (
              <TableRow key={n.id}>
                <TableCell><span className="font-medium">{n.name}</span></TableCell>
                <TableCell>{n.phone}</TableCell>
                <TableCell>{n.ward}</TableCell>
                <TableCell>
                  <StatusBadge status={n.status} />
                </TableCell>
                <TableCell>{formatDate(n.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(n)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(n.id)}
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
        {nurses.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{n.name}</p>
                <p className="text-sm text-slate-500">{n.phone} | {t('admission.ward')}: {n.ward}</p>
                <div className="mt-2">
                  <StatusBadge status={n.status} />
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
            <Button type="button" variant="outline" onClick={() => { setEditNurse(null); reset() }}>
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
        queryKeyPrefix="nurse"
        search={api.owner.searchAvailableNurses}
        doImport={api.owner.importNurse}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['nurses', hospitalId] })}
      />
    </div>
  )
}
