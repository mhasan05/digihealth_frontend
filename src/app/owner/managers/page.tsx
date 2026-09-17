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
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import type { Manager } from '@/types'

export default function ManagersPage() {
  const { t } = useTranslation()
  const roleLabel = t('role.manager')
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editManager, setEditManager] = useState<Manager | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)

  const managerSchema = useMemo(() => z.object({
    name:        z.string().min(2, t('settings.nameRequired')),
    phone:       z.string().min(11, t('auth.validPhone')),
    email:       z.string().email(t('settings.validEmail')),
    password:    z.string().optional(),
    status:      z.enum(['Active', 'Inactive', 'On-leave']),
    age:         z.coerce.number({ message: t('pathologistPage.ageRequired') }).int().min(0).max(150),
    gender:      z.enum(['Male', 'Female', 'Other'], { message: t('settings.selectGender') }),
    blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
    address:     z.string().min(1, t('pathologistPage.addressRequired')),
  }), [t])

  type ManagerForm = z.infer<typeof managerSchema>

  const GENDER_OPTIONS = [
    { value: 'Male',   label: t('patient.male')   },
    { value: 'Female', label: t('patient.female') },
    { value: 'Other',  label: t('patient.other')  },
  ]
  const BLOOD_GROUP_OPTIONS = [
    { value: '', label: t('settings.unknownBloodGroup') },
    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
  ]

  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['managers', hospitalId],
    queryFn:  () => api.owner.getManagers(hospitalId),
  })

  const {
    register, handleSubmit, reset, setError,
    formState: { errors },
  } = useForm<ManagerForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(managerSchema) as any,
    defaultValues: { status: 'Active' },
  })

  const addMutation = useMutation({
    mutationFn: (data: ManagerForm) => api.owner.addManager(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers', hospitalId] })
      setModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ManagerForm) => api.owner.updateManager(editManager!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers', hospitalId] })
      setModalOpen(false)
      setEditManager(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.owner.deleteManager(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers', hospitalId] })
      setDeleteId(null)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Manager['status'] }) =>
      api.owner.updateManager(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers', hospitalId] }),
  })

  const handleOpenAdd = () => {
    reset({ status: 'Active', password: '' })
    setEditManager(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (m: Manager) => {
    reset({
      name: m.name, phone: m.phone, email: m.email, status: m.status, password: '',
      age:         m.age ?? 0,
      gender:      (m.gender as 'Male' | 'Female' | 'Other') ?? 'Male',
      blood_group: (m.blood_group as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') ?? 'A+',
      address:     m.address ?? '',
    })
    setEditManager(m)
    setModalOpen(true)
  }

  const onSubmit = (data: ManagerForm) => {
    if (!editManager) {
      if (!data.password || data.password.length < 6) {
        setError('password', { message: t('auth.passwordMinLength') })
        return
      }
    } else if (data.password && data.password.length < 6) {
      setError('password', { message: t('auth.passwordMinLength') })
      return
    }
    if (editManager) {
      updateMutation.mutate(data)
    } else {
      addMutation.mutate(data)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('managerPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('managerPage.totalCount', { count: managers.length })}</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          {t('managerPage.addManager')}
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHead columns={[t('common.name'), t('common.phone'), t('common.email'), t('common.status'), t('staffPage.joined'), t('common.actions')]} />
          <TableBody isEmpty={managers.length === 0} emptyMessage={t('managerPage.noManagers')} colSpan={6}>
            {managers.map((m) => (
              <TableRow key={m.id}>
                <TableCell><span className="font-semibold text-slate-900">{m.name}</span></TableCell>
                <TableCell>{m.phone}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleStatusMutation.mutate({
                      id: m.id,
                      status: m.status === 'Active' ? 'Inactive' : 'Active',
                    })}
                    title={t('managerPage.toggleStatusHint')}
                    className="cursor-pointer"
                  >
                    <StatusBadge status={m.status} />
                  </button>
                </TableCell>
                <TableCell>{formatDate(m.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {managers.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-500">{m.phone} · {m.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => toggleStatusMutation.mutate({
                    id: m.id,
                    status: m.status === 'Active' ? 'Inactive' : 'Active',
                  })}>
                    <StatusBadge status={m.status} />
                  </button>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenEdit(m)} className="p-1.5 text-slate-400 hover:text-green-600 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(m.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditManager(null); reset() }}
        title={editManager ? t('staffPage.editTitle', { role: roleLabel }) : t('managerPage.addManager')}
        subtitle={!editManager ? t('loginBox.createSubtitle', { role: roleLabel }) : t('loginBox.editSubtitle')}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('common.name')}  error={errors.name?.message}  {...register('name')} />
          <Input label={t('common.phone')} error={errors.phone?.message} {...register('phone')} />
          <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t('patient.age')} type="number" error={errors.age?.message} {...register('age')} />
            <Select label={t('patient.gender')} error={errors.gender?.message} options={GENDER_OPTIONS} {...register('gender')} />
            <Select label={t('patient.bloodGroup')} error={errors.blood_group?.message} options={BLOOD_GROUP_OPTIONS} {...register('blood_group')} />
            <Input label={t('common.address')} error={errors.address?.message} {...register('address')} />
          </div>

          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-700">{t('loginBox.title')}</p>
            </div>
            <Input
              label={t('auth.password')}
              type="password"
              placeholder={editManager ? t('loginBox.newPasswordPlaceholder') : t('loginBox.minCharsPlaceholder')}
              hint={editManager ? undefined : t('loginBox.loginHint', { role: roleLabel })}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Select
            label={t('common.status')}
            error={errors.status?.message}
            options={[
              { value: 'Active',   label: t('status.active')   },
              { value: 'Inactive', label: t('status.inactive') },
              { value: 'On-leave', label: t('status.onLeave')  },
            ]}
            {...register('status')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditManager(null); reset() }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>
              {editManager ? t('staffPage.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('staffPage.deleteTitle', { role: roleLabel })}
        message={t('staffPage.deleteConfirmWithLogin', { role: roleLabel })}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
