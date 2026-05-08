"use client"

import { useState, useMemo } from 'react'
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

const hospitalSchema = z.object({
  name_bn:        z.string().min(2, 'বাংলা নাম দিন'),
  name_en:        z.string().min(2, 'ইংরেজি নাম দিন'),
  type:           z.enum(['General', 'Specialized', 'Clinic', 'Diagnostic']),
  address:        z.string().min(5, 'ঠিকানা দিন'),
  phone:          z.string().min(8, 'ফোন নম্বর দিন'),
  email:          z.string().email('সঠিক ইমেইল দিন'),
  beds:           z.coerce.number().min(0, 'বেড সংখ্যা দিন'),
  established:    z.string().min(1, 'প্রতিষ্ঠার তারিখ দিন'),
  owner_name:     z.string().optional(),
  owner_phone:    z.string().optional(),
  owner_email:    z.string().optional(),
  owner_password: z.string().optional(),
})

type HospitalForm = z.output<typeof hospitalSchema>

const PAGE_SIZE = 10

const typeLabels: Record<Hospital['type'], string> = {
  General:     'সাধারণ',
  Specialized: 'বিশেষায়িত',
  Clinic:      'ক্লিনিক',
  Diagnostic:  'ডায়াগনস্টিক',
}

export default function HospitalsPage() {
  const queryClient = useQueryClient()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editHospital, setEditHospital] = useState<Hospital | null>(null)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [pauseTarget,  setPauseTarget]  = useState<Hospital | null>(null)
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [errorMsg,     setErrorMsg]     = useState('')

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn:  () => api.admin.getHospitals(),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HospitalForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(hospitalSchema) as any,
  })

  const createMutation = useMutation({
    mutationFn: (data: HospitalForm) =>
      api.admin.createHospital({
        ...data,
        status:         'Active',
        owner_name:     data.owner_name     ?? '',
        owner_phone:    data.owner_phone    ?? '',
        owner_email:    data.owner_email    ?? '',
        owner_password: data.owner_password ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setModalOpen(false)
      reset()
    },
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
    editHospital ? updateMutation.mutate(data) : createMutation.mutate(data)
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
          <h2 className="text-xl font-bold text-slate-900">হাসপাতাল ব্যবস্থাপনা</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">মোট {hospitals.length}টি হাসপাতাল</p>
            {pausedCount > 0 && (
              <Badge variant="amber" dot>
                {pausedCount}টি বিরতিতে
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          নতুন হাসপাতাল
        </Button>
      </div>

      {/* Paused warning banner */}
      {pausedCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pausedCount}টি হাসপাতাল</span> বর্তমানে বিরতিতে আছে।
            বিরতিকালীন হাসপাতালের মালিক, ম্যানেজার এবং প্যাথলজিস্টরা লগইন করতে পারবেন না।
          </p>
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
          placeholder="হাসপাতাল খুঁজুন..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 pr-4 py-2.5 w-full border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHead columns={['হাসপাতালের নাম', 'ধরন', 'স্ট্যাটাস', 'বেড', 'প্রতিষ্ঠা', 'কার্যক্রম']} />
          <TableBody isEmpty={paginated.length === 0} emptyMessage="কোনো হাসপাতাল নেই" colSpan={6}>
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
                      aria-label={h.status === 'Active' ? 'বিরতি দিন' : 'সক্রিয় করুন'}
                      title={h.status === 'Active' ? 'বিরতি দিন' : 'সক্রিয় করুন'}
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
                      aria-label="সম্পাদনা"
                      title="সম্পাদনা"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeleteId(h.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="মুছুন"
                      title="মুছুন"
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
          <div className="text-center py-12 text-slate-500">কোনো হাসপাতাল নেই</div>
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
                      <span className="text-xs text-slate-400">{typeLabels[h.type]} · বেড: {h.beds}</span>
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
        title={editHospital ? 'হাসপাতাল সম্পাদনা' : 'নতুন হাসপাতাল যোগ করুন'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="বাংলা নাম"          error={errors.name_bn?.message}    {...register('name_bn')} />
            <Input label="ইংরেজি নাম"          error={errors.name_en?.message}    {...register('name_en')} />
            <Select
              label="হাসপাতালের ধরন"
              error={errors.type?.message}
              placeholder="ধরন নির্বাচন করুন"
              options={[
                { value: 'General',     label: 'সাধারণ'       },
                { value: 'Specialized', label: 'বিশেষায়িত'   },
                { value: 'Clinic',      label: 'ক্লিনিক'      },
                { value: 'Diagnostic',  label: 'ডায়াগনস্টিক' },
              ]}
              {...register('type')}
            />
            <Input label="বেড সংখ্যা"          type="number" error={errors.beds?.message}        {...register('beds')} />
            <Input label="ফোন নম্বর"            error={errors.phone?.message}      {...register('phone')} />
            <Input label="ইমেইল"               type="email"  error={errors.email?.message}       {...register('email')} />
            <Input label="প্রতিষ্ঠার তারিখ"    type="date"   error={errors.established?.message} {...register('established')} />
            <div className="sm:col-span-2">
              <Input label="ঠিকানা" error={errors.address?.message} {...register('address')} />
            </div>
          </div>

          {!editHospital && (
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-bold text-slate-800 mb-3">প্রাথমিক মালিকের তথ্য</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="মালিকের নাম"   {...register('owner_name')} />
                <Input label="মালিকের ফোন"   {...register('owner_phone')} />
                <Input label="মালিকের ইমেইল" type="email"    {...register('owner_email')} />
                <Input label="পাসওয়ার্ড"     type="password" {...register('owner_password')} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); setEditHospital(null); reset() }}>
              বাতিল
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editHospital ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pause confirmation */}
      <ConfirmDialog
        isOpen={!!pauseTarget}
        onClose={() => setPauseTarget(null)}
        onConfirm={() => pauseTarget && toggleStatusMutation.mutate(pauseTarget.id)}
        title="হাসপাতাল বিরতি দিন"
        message={`"${pauseTarget?.name_bn}" হাসপাতালটি বিরতিতে দিলে এই হাসপাতালের সকল স্টাফ (মালিক, ম্যানেজার, প্যাথলজিস্ট) তাৎক্ষণিকভাবে লগইন করতে পারবেন না। আপনি কি নিশ্চিত?`}
        confirmLabel="বিরতি দিন"
        isLoading={toggleStatusMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="হাসপাতাল মুছুন"
        message="আপনি কি এই হাসপাতালটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
