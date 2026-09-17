"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHead, TableBody, TableRow, TableCell, Pagination } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, Search, Building2, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react'
import type { Hospital } from '@/types'

const PAGE_SIZE = 10

export default function HospitalsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editHospital, setEditHospital] = useState<Hospital | null>(null)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [pauseTarget,  setPauseTarget]  = useState<Hospital | null>(null)
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [errorMsg,     setErrorMsg]     = useState('')

  const hospitalSchema = useMemo(() => z.object({
    name_bn:        z.string().min(2, t('hospitalPage.nameBnRequired')),
    name_en:        z.string().min(2, t('hospitalPage.nameEnRequired')),
    type:           z.enum(['General', 'Specialized', 'Clinic', 'Diagnostic', 'Hospital']),
    address:        z.string().min(5, t('hospitalPage.addressRequired')),
    phone:          z.string().min(8, t('hospitalPage.phoneRequired')),
    email:          z.string().email(t('hospitalPage.validEmail')),
    beds:           z.coerce.number().min(0, t('hospitalPage.bedsRequired')),
    established:    z.string().min(1, t('hospitalPage.establishedRequired')),
    owner_name:        z.string().optional(),
    owner_phone:       z.string().optional(),
    owner_email:       z.string().optional(),
    owner_password:    z.string().optional(),
    owner_age:         z.union([z.coerce.number().int().min(0).max(150), z.literal(''), z.undefined()]).optional(),
    owner_gender:      z.enum(['Male', 'Female', 'Other']).optional(),
    owner_blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    owner_address:     z.string().optional(),
  }), [t])

  type HospitalForm = z.output<typeof hospitalSchema>

  const OWNER_GENDER_OPTIONS = [
    { value: 'Male',   label: t('patient.male')   },
    { value: 'Female', label: t('patient.female') },
    { value: 'Other',  label: t('patient.other')  },
  ]
  const OWNER_BLOOD_GROUP_OPTIONS = [
    { value: '', label: t('settings.unknownBloodGroup') },
    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v })),
  ]

  const typeLabels: Record<Hospital['type'], string> = {
    General:     t('hospitalPage.typeGeneral'),
    Specialized: t('hospitalPage.typeSpecialized'),
    Clinic:      t('hospitalPage.typeClinic'),
    Diagnostic:  t('hospitalPage.typeDiagnostic'),
    Hospital:    t('hospitalPage.typeHospital'),
  }

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn:  () => api.admin.getHospitals(),
  })

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<HospitalForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(hospitalSchema) as any,
  })

  const createMutation = useMutation({
    mutationFn: (data: HospitalForm) =>
      api.admin.createHospital({
        ...data,
        status:            'Active',
        owner_name:        data.owner_name     ?? '',
        owner_phone:       data.owner_phone    ?? '',
        owner_email:       data.owner_email    ?? '',
        owner_password:    data.owner_password ?? '',
        owner_age:         Number(data.owner_age),
        owner_gender:      data.owner_gender!,
        owner_blood_group: data.owner_blood_group ?? '',
        owner_address:     data.owner_address ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setModalOpen(false)
      reset()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: HospitalForm) => api.admin.updateHospital(editHospital!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setModalOpen(false)
      setEditHospital(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteHospital(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setDeleteId(null)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      setDeleteId(null)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.admin.toggleHospitalStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setPauseTarget(null)
    },
  })

  const handleOpenAdd = () => {
    reset({})
    setEditHospital(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (hospital: Hospital) => {
    reset(hospital)
    setEditHospital(hospital)
    setModalOpen(true)
  }

  const handleToggleStatus = (hospital: Hospital) => {
    if (hospital.status === 'Active') {
      setPauseTarget(hospital)
    } else {
      toggleStatusMutation.mutate(hospital.id)
    }
  }

  const onSubmit = (data: HospitalForm) => {
    if (editHospital) { updateMutation.mutate(data); return }

    // Owner block is required on create
    let blocked = false
    if (!data.owner_name?.trim())     { setError('owner_name',     { message: t('hospitalPage.ownerNameRequired') });   blocked = true }
    if (!data.owner_phone?.trim())    { setError('owner_phone',    { message: t('hospitalPage.ownerPhoneRequired') });   blocked = true }
    if (!data.owner_email?.trim())    { setError('owner_email',    { message: t('hospitalPage.ownerEmailRequired') }); blocked = true }
    if (!data.owner_password?.trim() || data.owner_password.length < 6) {
      setError('owner_password', { message: t('hospitalPage.ownerPasswordRequired') })
      blocked = true
    }
    if (data.owner_age == null || data.owner_age === '' || Number.isNaN(Number(data.owner_age))) {
      setError('owner_age', { message: t('hospitalPage.ownerAgeRequired') });   blocked = true
    }
    if (!data.owner_gender)      { setError('owner_gender',  { message: t('hospitalPage.ownerGenderRequired') }); blocked = true }
    if (!data.owner_address?.trim()) { setError('owner_address', { message: t('hospitalPage.addressRequired') });        blocked = true }
    if (blocked) return

    createMutation.mutate(data)
  }

  const { filtered, paginated, totalPages, pausedCount } = useMemo(() => {
    const q        = search.toLowerCase()
    const filtered = hospitals.filter(h =>
      h.name_bn.toLowerCase().includes(q) || h.name_en.toLowerCase().includes(q)
    )
    return {
      filtered,
      paginated:   filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      totalPages:  Math.ceil(filtered.length / PAGE_SIZE),
      pausedCount: hospitals.filter(h => h.status === 'Paused').length,
    }
  }, [hospitals, search, page])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('hospitalPage.title')}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">{t('hospitalPage.totalCount', { count: hospitals.length })}</p>
            {pausedCount > 0 && (
              <Badge variant="amber" dot>
                {t('hospitalPage.pausedCount', { count: pausedCount })}
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          {t('hospitalPage.addHospital')}
        </Button>
      </div>

      {/* Paused warning banner */}
      {pausedCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{t('hospitalPage.pausedBannerText', { count: pausedCount })}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('hospitalPage.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 pr-4 py-2.5 w-full border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHead columns={[
            t('hospitalPage.colName'),
            t('hospitalPage.colType'),
            t('common.status'),
            t('hospitalPage.colBeds'),
            t('hospitalPage.colEstablished'),
            t('common.actions'),
          ]} />
          <TableBody isEmpty={paginated.length === 0} emptyMessage={t('hospitalPage.noHospitals')} colSpan={6}>
            {paginated.map((h) => (
              <TableRow
                key={h.id}
                className={h.status === 'Paused' ? 'bg-amber-50/60 hover:bg-amber-50' : undefined}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="font-semibold text-slate-900">{h.name_bn}</p>
                      <p className="text-xs text-slate-400">{h.name_en}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">{typeLabels[h.type]}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={h.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-slate-700">{h.beds}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-600">{formatDate(h.established)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Pause / Activate */}
                    <button
                      onClick={() => handleToggleStatus(h)}
                      disabled={toggleStatusMutation.isPending}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                        h.status === 'Active'
                          ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-amber-500 hover:text-green-600 hover:bg-green-50'
                      }`}
                      aria-label={h.status === 'Active' ? t('hospitalPage.pause') : t('hospitalPage.activate')}
                      title={h.status === 'Active' ? t('hospitalPage.pause') : t('hospitalPage.activate')}
                    >
                      {h.status === 'Active'
                        ? <PauseCircle className="w-4 h-4" />
                        : <PlayCircle  className="w-4 h-4" />
                      }
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(h)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteId(h.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-12 text-slate-500">{t('hospitalPage.noHospitals')}</div>
        ) : (
          paginated.map((h) => (
            <div
              key={h.id}
              className={`rounded-2xl border p-4 ${
                h.status === 'Paused'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${h.status === 'Paused' ? 'bg-amber-100' : 'bg-green-50'}`}>
                    <Building2 className={`w-5 h-5 ${h.status === 'Paused' ? 'text-amber-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{h.name_bn}</p>
                    <p className="text-xs text-slate-500">{h.name_en}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-slate-400">{typeLabels[h.type]} · {t('hospitalPage.bedsShort')}: {h.beds}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(h)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      h.status === 'Active'
                        ? 'text-slate-400 hover:text-amber-600'
                        : 'text-amber-500 hover:text-green-600'
                    }`}
                  >
                    {h.status === 'Active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleOpenEdit(h)} className="p-1.5 text-slate-400 hover:text-green-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(h.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditHospital(null); reset() }}
        title={editHospital ? t('hospitalPage.editTitle') : t('hospitalPage.addTitle')}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('hospitalPage.nameBn')} error={errors.name_bn?.message} {...register('name_bn')} />
            <Input label={t('hospitalPage.nameEn')} error={errors.name_en?.message} {...register('name_en')} />
            <Select
              label={t('hospitalPage.hospitalType')}
              error={errors.type?.message}
              placeholder={t('hospitalPage.selectType')}
              options={[
                { value: 'General',     label: t('hospitalPage.typeGeneral')     },
                { value: 'Specialized', label: t('hospitalPage.typeSpecialized') },
                { value: 'Clinic',      label: t('hospitalPage.typeClinic')      },
                { value: 'Diagnostic',  label: t('hospitalPage.typeDiagnostic')  },
                { value: 'Hospital',    label: t('hospitalPage.typeHospital')    },
              ]}
              {...register('type')}
            />
            <Input label={t('hospitalPage.bedCount')} type="number" error={errors.beds?.message} {...register('beds')} />
            <Input label={t('common.phone')} error={errors.phone?.message} {...register('phone')} />
            <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
            <Input label={t('hospitalPage.establishedDate')} type="date" error={errors.established?.message} {...register('established')} />
            <div className="sm:col-span-2">
              <Input label={t('common.address')} error={errors.address?.message} {...register('address')} />
            </div>
          </div>

          {!editHospital && (
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-bold text-slate-800 mb-3">{t('hospitalPage.primaryOwnerInfo')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('hospitalPage.ownerName')} error={errors.owner_name?.message} {...register('owner_name')} />
                <Input label={t('hospitalPage.ownerPhone')} error={errors.owner_phone?.message} {...register('owner_phone')} />
                <Input label={t('hospitalPage.ownerEmail')} type="email" error={errors.owner_email?.message} {...register('owner_email')} />
                <Input label={t('auth.password')} type="password" error={errors.owner_password?.message} {...register('owner_password')} />
                <Input label={t('hospitalPage.ownerAge')} type="number" error={errors.owner_age?.message} {...register('owner_age')} />
                <Select label={t('hospitalPage.ownerGender')} error={errors.owner_gender?.message} placeholder={t('additionalRole.selectPlaceholder')} options={OWNER_GENDER_OPTIONS} {...register('owner_gender')} />
                <Select label={t('hospitalPage.ownerBloodGroupOptional')} error={errors.owner_blood_group?.message} options={OWNER_BLOOD_GROUP_OPTIONS} {...register('owner_blood_group')} />
                <Input label={t('hospitalPage.ownerAddress')} error={errors.owner_address?.message} {...register('owner_address')} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditHospital(null); reset() }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editHospital ? t('staffPage.update') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pause confirmation */}
      <ConfirmDialog
        isOpen={!!pauseTarget}
        onClose={() => setPauseTarget(null)}
        onConfirm={() => pauseTarget && toggleStatusMutation.mutate(pauseTarget.id)}
        title={t('hospitalPage.pauseTitle')}
        message={t('hospitalPage.pauseConfirm', { name: pauseTarget?.name_bn ?? '' })}
        tone="warning"
        confirmLabel={t('hospitalPage.yesPause')}
        cancelLabel={t('hospitalPage.no')}
        isLoading={toggleStatusMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('hospitalPage.deleteTitle')}
        message={t('hospitalPage.deleteConfirm')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
