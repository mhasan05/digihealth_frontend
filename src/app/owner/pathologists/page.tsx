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
import type { Pathologist } from '@/types'

export default function PathologistsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [importOpen, setImportOpen] = useState(false)
  const [editPathologist, setEditPathologist] = useState<Pathologist | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Owners can only edit an already-imported pathologist's own-hospital fields
  // (name/email/specialization/status/demographics) — phone and password are
  // never accepted by PathologistDetailView.put(), so they're left out here.
  const pathologistEditSchema = useMemo(() => z.object({
    name:           z.string().min(2, t('settings.nameRequired')),
    email:          z.string().email(t('settings.validEmail')),
    specialization: z.string().min(2, t('pathologistPage.specialization')),
    status:         z.enum(['Active', 'Inactive']),
    age:            z.coerce.number({ message: t('pathologistPage.ageRequired') }).int().min(0).max(150),
    gender:         z.enum(['Male', 'Female', 'Other'], { message: t('settings.selectGender') }),
    blood_group:    z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
    address:        z.string().min(1, t('pathologistPage.addressRequired')),
  }), [t])

  type PathologistEditForm = z.infer<typeof pathologistEditSchema>

  const GENDER_OPTIONS = [
    { value: 'Male',   label: t('patient.male')   },
    { value: 'Female', label: t('patient.female') },
    { value: 'Other',  label: t('patient.other')  },
  ]
  const BLOOD_GROUP_OPTIONS = [
    { value: '', label: t('settings.unknownBloodGroup') },
    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
  ]

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
          <h2 className="text-xl font-bold text-slate-900">{t('staffPage.title', { role: t('role.pathologist') })}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('staffPage.totalCount', { count: pathologists.length, role: t('role.pathologist') })}</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UserPlus className="w-4 h-4" />
          {t('staffPage.addFromApplicants')}
        </Button>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        {t('pathologistPage.unattachedHint')}
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[t('common.name'), t('common.phone'), t('pathologistPage.specialization'), t('common.status'), t('staffPage.joined'), t('common.actions')]} />
          <TableBody isEmpty={pathologists.length === 0} emptyMessage={t('staffPage.noStaff', { role: t('role.pathologist') })} colSpan={6}>
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
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
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
        {pathologists.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.phone} | {p.specialization}</p>
                <div className="mt-2">
                  <StatusBadge status={p.status} />
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
        title={t('staffPage.editTitle', { role: t('role.pathologist') })}
        subtitle={editPathologist ? t('pathologistPage.phoneUneditable', { phone: editPathologist.phone }) : undefined}
        size="sm"
      >
        <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <Input label={t('common.name')} error={errors.name?.message} {...register('name')} />
          <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t('patient.age')} type="number" error={errors.age?.message} {...register('age')} />
            <Select label={t('patient.gender')} error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label={t('patient.bloodGroup')} error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label={t('common.address')} error={errors.address?.message} {...register('address')} />
          </div>

          <Input label={t('pathologistPage.specialization')} error={errors.specialization?.message} {...register('specialization')} />
          <Select
            label={t('common.status')}
            error={errors.status?.message}
            options={[
              { value: 'Active', label: t('status.active') },
              { value: 'Inactive', label: t('status.inactive') },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setEditPathologist(null); reset() }}>
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
        title={t('staffPage.deleteTitle', { role: t('role.pathologist') })}
        message={t('staffPage.deleteConfirmWithLogin', { role: t('role.pathologist') })}
        isLoading={deleteMutation.isPending}
      />

      <StaffImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        roleLabel={t('role.pathologist')}
        queryKeyPrefix="pathologist"
        extraFieldLabel={t('pathologistPage.specializationOptional')}
        search={api.owner.searchAvailablePathologists}
        doImport={api.owner.importPathologist}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['pathologists', hospitalId] })}
      />
    </div>
  )
}
