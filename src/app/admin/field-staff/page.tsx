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
import { Modal } from '@/components/ui/modal'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Search, Smartphone, AlertTriangle, PauseCircle, PlayCircle, KeyRound } from 'lucide-react'
import type { FieldStaff } from '@/types'

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/

export default function AdminFieldStaffPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editStaff, setEditStaff] = useState<FieldStaff | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Password is required when adding; when editing, blank means "keep current".
  const staffSchema = useMemo(() => z.object({
    name: z.string().min(2, t('fieldStaffPage.nameRequired')),
    phone: z.string().refine(v => BD_MOBILE.test(v.replace(/[\s-]/g, '')), t('fieldStaffPage.phoneInvalid')),
    area: z.string().optional(),
    password: z.string().refine(v => v === '' || v.length >= 6, t('fieldStaffPage.passwordMin')),
  }).refine(d => editStaff || d.password.length >= 6, {
    path: ['password'], message: t('fieldStaffPage.passwordMin'),
  }), [t, editStaff])

  type StaffForm = z.infer<typeof staffSchema>

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['admin-field-staff'],
    queryFn: () => api.admin.getFieldStaff(),
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staff
    return staff.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.area.toLowerCase().includes(q),
    )
  }, [staff, query])

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', phone: '', area: '', password: '' },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-field-staff'] })

  const createMutation = useMutation({
    mutationFn: (data: StaffForm) =>
      api.admin.createFieldStaff({
        name: data.name,
        phone: data.phone,
        password: data.password,
        area: data.area?.trim() || undefined,
      }),
    onSuccess: () => { invalidate(); closeModal() },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: StaffForm) =>
      api.admin.updateFieldStaff(editStaff!.id, {
        name: data.name,
        area: data.area?.trim() ?? '',
        ...(data.password ? { password: data.password } : {}),
      }),
    onSuccess: () => { invalidate(); closeModal() },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'Active' | 'Inactive' }) =>
      api.admin.updateFieldStaff(id, { status: next }),
    onSuccess: invalidate,
  })

  const openAdd = () => {
    setEditStaff(null)
    form.reset({ name: '', phone: '', area: '', password: '' })
    setErrorMsg(null)
    setModalOpen(true)
  }

  const openEdit = (s: FieldStaff) => {
    setEditStaff(s)
    form.reset({ name: s.name, phone: s.phone, area: s.area, password: '' })
    setErrorMsg(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditStaff(null)
    setErrorMsg(null)
    form.reset()
  }

  const onSubmit = (data: StaffForm) => {
    setErrorMsg(null)
    if (editStaff) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const StatusToggle = ({ s }: { s: FieldStaff }) => {
    const inactive = s.status === 'Inactive'
    const label = inactive ? t('fieldStaffPage.activate') : t('fieldStaffPage.deactivate')
    return (
      <button
        onClick={() => statusMutation.mutate({ id: s.id, next: inactive ? 'Active' : 'Inactive' })}
        disabled={statusMutation.isPending}
        className={`p-1.5 rounded transition-colors ${
          inactive
            ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
        }`}
        aria-label={label}
        title={label}
      >
        {inactive ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
      </button>
    )
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('fieldStaffPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('fieldStaffPage.subtitle', { count: staff.length })}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t('fieldStaffPage.add')}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('fieldStaffPage.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
        />
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[
            t('common.name'),
            t('common.phone'),
            t('fieldStaffPage.colArea'),
            t('fieldStaffPage.colUploads'),
            t('common.status'),
            t('fieldStaffPage.colAddedOn'),
            t('common.actions'),
          ]} />
          <TableBody isEmpty={filtered.length === 0} emptyMessage={t('fieldStaffPage.empty')} colSpan={7}>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </TableCell>
                <TableCell>{s.phone}</TableCell>
                <TableCell>
                  {s.area
                    ? <span className="text-sm text-slate-700">{s.area}</span>
                    : <span className="text-xs text-slate-400">{t('common.none')}</span>}
                </TableCell>
                <TableCell><span className="text-sm text-slate-700">{s.prescription_count}</span></TableCell>
                <TableCell>
                  <Badge variant={s.status === 'Active' ? 'green' : 'gray'} dot>
                    {s.status === 'Active' ? t('status.active') : t('status.inactive')}
                  </Badge>
                </TableCell>
                <TableCell><span className="text-xs text-slate-500">{formatDate(s.created_at)}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StatusToggle s={s} />
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      aria-label={t('common.edit')}>
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="text-sm text-slate-500">{s.phone}</p>
                {s.area && <p className="text-sm text-slate-600">{s.area}</p>}
                <p className="text-xs text-slate-400 mt-1">{t('fieldStaffPage.uploadsShort', { count: s.prescription_count })}</p>
                <div className="mt-2">
                  <Badge variant={s.status === 'Active' ? 'green' : 'gray'} dot>
                    {s.status === 'Active' ? t('status.active') : t('status.inactive')}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <StatusToggle s={s} />
                <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-green-600" aria-label={t('common.edit')}>
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">{t('fieldStaffPage.empty')}</p>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editStaff ? t('fieldStaffPage.editTitle') : t('fieldStaffPage.addTitle')}
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('common.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input
            label={t('common.phone')}
            placeholder="01XXXXXXXXX"
            disabled={!!editStaff}
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
          <Input
            label={t('fieldStaffPage.areaOptional')}
            placeholder={t('fieldStaffPage.areaPlaceholder')}
            {...form.register('area')}
          />
          <Input
            type="password"
            label={editStaff ? t('fieldStaffPage.newPasswordOptional') : t('fieldStaffPage.password')}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          {editStaff && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 -mt-2">
              <KeyRound className="w-3.5 h-3.5" />
              {t('fieldStaffPage.passwordHint')}
            </p>
          )}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>{t('common.cancel')}</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editStaff ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
