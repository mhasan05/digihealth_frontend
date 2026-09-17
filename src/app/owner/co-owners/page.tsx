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
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

export default function CoOwnersPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const coOwnerSchema = useMemo(() => z.object({
    name:        z.string().min(2, t('settings.nameRequired')),
    phone:       z.string().min(11, t('auth.validPhone')),
    email:       z.string().email(t('settings.validEmail')),
    password:    z.string().min(6, t('auth.passwordMinLength')),
    age:         z.coerce.number({ message: t('pathologistPage.ageRequired') }).int().min(0).max(150),
    gender:      z.enum(['Male', 'Female', 'Other'], { message: t('settings.selectGender') }),
    blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
    address:     z.string().min(1, t('pathologistPage.addressRequired')),
  }), [t])

  type CoOwnerForm = z.infer<typeof coOwnerSchema>

  const GENDER_OPTIONS = [
    { value: 'Male',   label: t('patient.male')   },
    { value: 'Female', label: t('patient.female') },
    { value: 'Other',  label: t('patient.other')  },
  ]
  const BLOOD_GROUP_OPTIONS = [
    { value: '', label: t('settings.unknownBloodGroup') },
    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
  ]

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
          <h2 className="text-xl font-bold text-slate-900">{t('coOwnerPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('coOwnerPage.totalCount', { count: owners.length })}</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true) }}>
          <Plus className="w-4 h-4" />
          {t('coOwnerPage.addCoOwner')}
        </Button>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[t('common.name'), t('common.phone'), t('common.email'), t('coOwnerPage.primary'), t('staffPage.joined'), t('common.actions')]} />
          <TableBody isEmpty={owners.length === 0} emptyMessage={t('coOwnerPage.noCoOwners')} colSpan={6}>
            {owners.map((o) => (
              <TableRow key={o.id}>
                <TableCell><span className="font-medium">{o.name}</span></TableCell>
                <TableCell>{o.phone}</TableCell>
                <TableCell>{o.email}</TableCell>
                <TableCell>
                  {o.is_primary ? <Badge variant="blue">{t('coOwnerPage.primary')}</Badge> : <Badge variant="gray">{t('coOwnerPage.coOwner')}</Badge>}
                </TableCell>
                <TableCell>{formatDate(o.created_at)}</TableCell>
                <TableCell>
                  {!o.is_primary && (
                    <button
                      onClick={() => setDeleteId(o.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label={t('common.delete')}
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
                  {o.is_primary ? <Badge variant="blue">{t('coOwnerPage.primary')}</Badge> : <Badge variant="gray">{t('coOwnerPage.coOwner')}</Badge>}
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title={t('coOwnerPage.addCoOwner')} size="sm">
        <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
          <Input label={t('common.name')} error={errors.name?.message} {...register('name')} />
          <Input label={t('common.phone')} error={errors.phone?.message} {...register('phone')} />
          <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Input label={t('auth.password')} type="password" error={errors.password?.message} {...register('password')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t('patient.age')} type="number" error={errors.age?.message} {...register('age')} />
            <Select label={t('patient.gender')} error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label={t('patient.bloodGroup')} error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label={t('common.address')} error={errors.address?.message} {...register('address')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); reset() }}>{t('common.cancel')}</Button>
            <Button type="submit" loading={addMutation.isPending}>{t('common.add')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('coOwnerPage.deleteTitle')}
        message={t('coOwnerPage.deleteConfirm')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
