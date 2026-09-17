"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
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
import { Pencil, Trash2, Search, UserPlus, Stethoscope, AlertTriangle, Info, PauseCircle } from 'lucide-react'
import type { Doctor, RegistryDoctor } from '@/types'

export default function DoctorsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const queryClient = useQueryClient()

  const attachmentSchema = useMemo(() => z.object({
    schedule: z.string().min(2, t('doctorPage.scheduleRequired')),
    status: z.enum(['Active', 'Inactive']),
  }), [t])
  type AttachmentForm = z.infer<typeof attachmentSchema>

  const editSchema = useMemo(() => z.object({
    schedule: z.string().min(2, t('doctorPage.scheduleRequired')),
    status: z.enum(['Active', 'Inactive']),
  }), [t])
  type EditForm = z.infer<typeof editSchema>

  const [attachOpen, setAttachOpen] = useState(false)
  const [pickedRegistryDoctor, setPickedRegistryDoctor] = useState<RegistryDoctor | null>(null)
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null)
  const [detachDoctor, setDetachDoctor] = useState<Doctor | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', hospitalId],
    queryFn: () => api.owner.getDoctors(hospitalId),
  })

  const attachForm = useForm<AttachmentForm>({
    resolver: zodResolver(attachmentSchema),
    defaultValues: { schedule: '', status: 'Active' },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { schedule: '', status: 'Active' },
  })

  const attachMutation = useMutation({
    mutationFn: (data: AttachmentForm) =>
      api.owner.attachDoctor(hospitalId, {
        doctor_id: pickedRegistryDoctor!.id,
        schedule: data.schedule,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      closeAttach()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => api.owner.updateDoctor(editDoctor!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      closeEdit()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const detachMutation = useMutation({
    mutationFn: (id: string) => api.owner.detachDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', hospitalId] })
      setDetachDoctor(null)
    },
  })

  const openAttach = () => {
    setPickedRegistryDoctor(null)
    attachForm.reset({ schedule: '', status: 'Active' })
    setErrorMsg(null)
    setAttachOpen(true)
  }
  const closeAttach = () => {
    setAttachOpen(false)
    setPickedRegistryDoctor(null)
    setErrorMsg(null)
    attachForm.reset()
  }

  const openEdit = (d: Doctor) => {
    setEditDoctor(d)
    editForm.reset({ schedule: d.schedule, status: d.status })
    setErrorMsg(null)
  }
  const closeEdit = () => {
    setEditDoctor(null)
    setErrorMsg(null)
    editForm.reset()
  }

  if (isLoading) return <LoadingSpinner />

  const editingUnavailable = editDoctor?.availability_status === 'Unavailable'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('doctorPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('doctorPage.totalCount', { count: doctors.length })}</p>
        </div>
        <Button onClick={openAttach}>
          <UserPlus className="w-4 h-4" />
          {t('doctorPage.attachFromRegistry')}
        </Button>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{t('doctorPage.scopeHint')}</span>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[
            t('common.name'),
            t('doctorPage.bmdcNo'),
            t('doctorPage.specialization'),
            t('common.phone'),
            t('doctorPage.schedule'),
            t('common.status'),
            t('common.actions'),
          ]} />
          <TableBody isEmpty={doctors.length === 0} emptyMessage={t('doctorPage.noDoctorsAttached')} colSpan={7}>
            {doctors.map((d) => {
              const unavailable = d.availability_status === 'Unavailable'
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(d.created_at)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {d.bmdc_registration_no
                      ? <span className="font-mono text-xs text-slate-700">{d.bmdc_registration_no}</span>
                      : <span className="text-xs text-slate-400">{t('doctorPage.noneShort')}</span>}
                  </TableCell>
                  <TableCell>{d.specialization}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 max-w-[180px] truncate block">{d.schedule}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={d.status === 'Active' && !unavailable ? 'green' : 'gray'}>
                        {d.status === 'Active' ? t('status.active') : t('status.inactive')}
                      </Badge>
                      {unavailable && (
                        <Badge variant="red">
                          <PauseCircle className="w-3 h-3" /> {t('doctorPage.adminUnavailable')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(d)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        aria-label={t('common.edit')}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDetachDoctor(d)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label={t('doctorPage.detach')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {doctors.map((d) => {
          const unavailable = d.availability_status === 'Unavailable'
          return (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-sm text-slate-500">{d.specialization} · {d.phone}</p>
                  <p className="text-xs text-slate-400 mt-1">{d.schedule}</p>
                  {d.bmdc_registration_no && (
                    <p className="text-xs font-mono text-slate-500 mt-1">BMDC: {d.bmdc_registration_no}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant={d.status === 'Active' && !unavailable ? 'green' : 'gray'}>
                      {d.status === 'Active' ? t('status.active') : t('status.inactive')}
                    </Badge>
                    {unavailable && <Badge variant="red">{t('doctorPage.adminUnavailable')}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-green-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDetachDoctor(d)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Attach modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={attachOpen}
        onClose={closeAttach}
        title={pickedRegistryDoctor ? t('doctorPage.attachToHospitalTitle') : t('doctorPage.findFromRegistryTitle')}
        size="sm"
      >
        {!pickedRegistryDoctor ? (
          <RegistrySearchStep onPick={setPickedRegistryDoctor} onCancel={closeAttach} />
        ) : (
          <form onSubmit={attachForm.handleSubmit(d => attachMutation.mutate(d))} className="space-y-4">
            <DoctorIdentityCard
              name={pickedRegistryDoctor.name}
              phone={pickedRegistryDoctor.phone}
              bmdc={pickedRegistryDoctor.bmdc_registration_no ?? null}
              specialization={pickedRegistryDoctor.specialization}
            />
            <Input
              label={t('doctorPage.schedulePlaceholder')}
              error={attachForm.formState.errors.schedule?.message}
              {...attachForm.register('schedule')}
            />
            <Select
              label={t('common.status')}
              error={attachForm.formState.errors.status?.message}
              options={[
                { value: 'Active', label: t('status.active') },
                { value: 'Inactive', label: t('status.inactive') },
              ]}
              {...attachForm.register('status')}
            />
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPickedRegistryDoctor(null)}>
                ← {t('doctorPage.pickAnotherDoctor')}
              </Button>
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="outline" onClick={closeAttach}>{t('common.cancel')}</Button>
                <Button type="submit" loading={attachMutation.isPending}>{t('common.add')}</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Edit modal (per-hospital fields only) ───────────────────────── */}
      <Modal
        isOpen={!!editDoctor}
        onClose={closeEdit}
        title={t('doctorPage.editHospitalInfoTitle')}
        size="sm"
      >
        {editDoctor && (
          <form onSubmit={editForm.handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
            <DoctorIdentityCard
              name={editDoctor.name}
              phone={editDoctor.phone}
              bmdc={editDoctor.bmdc_registration_no ?? null}
              specialization={editDoctor.specialization}
            />
            {editingUnavailable && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                <PauseCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t('doctorPage.unavailableNotice')}</span>
              </div>
            )}
            <Input
              label={t('doctorPage.schedule')}
              error={editForm.formState.errors.schedule?.message}
              {...editForm.register('schedule')}
            />
            <Select
              label={t('common.status')}
              error={editForm.formState.errors.status?.message}
              options={
                editingUnavailable
                  ? [{ value: 'Inactive', label: t('status.inactive') }]
                  : [
                      { value: 'Active', label: t('status.active') },
                      { value: 'Inactive', label: t('status.inactive') },
                    ]
              }
              {...editForm.register('status')}
            />
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeEdit}>{t('common.cancel')}</Button>
              <Button type="submit" loading={updateMutation.isPending}>{t('staffPage.update')}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!detachDoctor}
        onClose={() => setDetachDoctor(null)}
        onConfirm={() => detachDoctor && detachMutation.mutate(detachDoctor.id)}
        title={t('doctorPage.detachTitle')}
        message={t('doctorPage.detachConfirm', { name: detachDoctor?.name ?? '' })}
        isLoading={detachMutation.isPending}
      />
    </div>
  )
}

// ─── Identity card (read-only) ────────────────────────────────────────────────

function DoctorIdentityCard({
  name,
  phone,
  bmdc,
  specialization,
}: {
  name: string
  phone: string
  bmdc: string | null
  specialization?: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <Stethoscope className="w-5 h-5 text-green-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
        {specialization && (
          <p className="text-xs text-green-700">{specialization}</p>
        )}
        <p className="text-xs text-slate-500">
          {phone}
          {bmdc && <span className="ml-2 font-mono text-slate-500">· BMDC: {bmdc}</span>}
        </p>
      </div>
    </div>
  )
}

// ─── Registry search step ─────────────────────────────────────────────────────

function RegistrySearchStep({
  onPick,
  onCancel,
}: {
  onPick: (d: RegistryDoctor) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const hospitalId = user?.active_hospital_id ?? 'h1'
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['registry-doctor-search', hospitalId, query],
    queryFn: () => api.owner.searchRegistryDoctors(query),
    enabled: query.trim().length >= 1,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {t('doctorPage.searchLabel')}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('doctorPage.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
          />
        </div>
      </div>

      <div className="min-h-[180px] max-h-72 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/40">
        {query.trim().length < 1 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center px-6 text-sm text-slate-400">
            <Search className="w-8 h-8 mb-2 text-slate-300" />
            {t('staffImport.startSearching')}
          </div>
        ) : isFetching ? (
          <div className="flex items-center justify-center h-44 text-sm text-slate-400">{t('staffImport.searching')}</div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center px-6 text-sm text-slate-500">
            <AlertTriangle className="w-6 h-6 mb-2 text-amber-400" />
            {t('doctorPage.noAvailableDoctors')}
            <span className="text-xs text-slate-400 mt-1">{t('doctorPage.contactAdminToAdd')}</span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {results.map(d => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onPick(d)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                    {d.specialization && (
                      <p className="text-xs text-green-700 truncate">{d.specialization}</p>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {d.phone}
                      {d.bmdc_registration_no && (
                        <span className="ml-2 font-mono text-slate-500">· BMDC: {d.bmdc_registration_no}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-green-700 font-semibold whitespace-nowrap">{t('common.add')} →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  )
}
