"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Check, X, Eye, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react'
import { ROLE_APPLICATION_TYPES, type AdminRoleApplication, type RoleApplicationType, type RoleApplicationStatus } from '@/types'

export default function AdminRoleApplicationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<RoleApplicationStatus | ''>('Pending')
  const [roleTypeFilter, setRoleTypeFilter] = useState<RoleApplicationType | ''>('')
  const [detail, setDetail] = useState<AdminRoleApplication | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminRoleApplication | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const STATUS_OPTIONS: { value: RoleApplicationStatus | ''; label: string }[] = [
    { value: '', label: t('roleAppPage.allStatuses') },
    { value: 'Pending', label: t('status.pending') },
    { value: 'Approved', label: t('status.approved') },
    { value: 'Rejected', label: t('status.rejected') },
  ]

  const ROLE_TYPE_OPTIONS: { value: RoleApplicationType | ''; label: string }[] = [
    { value: '', label: t('roleAppPage.allRoles') },
    ...ROLE_APPLICATION_TYPES.map(r => ({ value: r.value, label: t(r.labelKey) })),
  ]

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admin-role-applications', statusFilter, roleTypeFilter],
    queryFn: () => api.admin.getRoleApplications({
      status: statusFilter || undefined,
      role_type: roleTypeFilter || undefined,
    }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveRoleApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-applications'] })
      setDetail(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.admin.rejectRoleApplication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-applications'] })
      setRejectTarget(null)
      setRejectReason('')
      setDetail(null)
    },
  })

  const roleLabel = (type: RoleApplicationType) => {
    const found = ROLE_APPLICATION_TYPES.find(r => r.value === type)
    return found ? t(found.labelKey) : type
  }

  const pendingCount = useMemo(() => applications.filter(a => a.status === 'Pending').length, [applications])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t('roleAppPage.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t('roleAppPage.totalCount', { count: applications.length })} {statusFilter === 'Pending' && t('roleAppPage.pendingCount', { count: pendingCount })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RoleApplicationStatus | '')}
        />
        <Select
          options={ROLE_TYPE_OPTIONS}
          value={roleTypeFilter}
          onChange={e => setRoleTypeFilter(e.target.value as RoleApplicationType | '')}
        />
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={[
            t('roleAppPage.colApplicant'),
            t('roleAppPage.colRole'),
            t('roleAppPage.colRegNo'),
            t('roleAppPage.colAppliedDate'),
            t('common.status'),
            t('common.actions'),
          ]} />
          <TableBody isEmpty={applications.length === 0} emptyMessage={t('roleAppPage.noApplications')} colSpan={6}>
            {applications.map(app => (
              <TableRow key={app.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{app.applicant_name}</p>
                    <p className="text-xs text-slate-400">{app.applicant_phone}</p>
                  </div>
                </TableCell>
                <TableCell>{roleLabel(app.role_type)}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-slate-700">{app.registration_number || t('roleAppPage.noneShort')}</span>
                </TableCell>
                <TableCell><span className="text-xs text-slate-500">{formatDate(app.created_at)}</span></TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetail(app)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      aria-label={t('roleAppPage.viewDetails')}>
                      <Eye className="w-4 h-4" />
                    </button>
                    {app.status === 'Pending' && (
                      <>
                        <button onClick={() => approveMutation.mutate(app.id)}
                          disabled={approveMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          aria-label={t('roleAppPage.approve')}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setRejectTarget(app); setRejectReason('') }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label={t('roleAppPage.reject')}>
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {applications.map(app => (
          <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{app.applicant_name}</p>
                <p className="text-sm text-slate-500">{app.applicant_phone}</p>
                <p className="text-sm text-slate-600 mt-1">{roleLabel(app.role_type)}</p>
                <div className="mt-2"><StatusBadge status={app.status} /></div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setDetail(app)} className="p-1.5 text-slate-400 hover:text-blue-600">
                  <Eye className="w-4 h-4" />
                </button>
                {app.status === 'Pending' && (
                  <>
                    <button onClick={() => approveMutation.mutate(app.id)} className="p-1.5 text-slate-400 hover:text-green-600">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setRejectTarget(app); setRejectReason('') }} className="p-1.5 text-slate-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={t('roleAppPage.detailTitle')} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label={t('roleAppPage.colApplicant')} value={detail.applicant_name} />
              <Field label={t('common.phone')} value={detail.applicant_phone} />
              <Field label={t('roleAppPage.healthId')} value={detail.applicant_health_id} />
              <Field label={t('roleAppPage.colRole')} value={roleLabel(detail.role_type)} />
              <Field label={t('roleAppPage.registrationNumber')} value={detail.registration_number || t('roleAppPage.noneShort')} />
              <Field label={t('roleAppPage.appliedDate')} value={formatDateTime(detail.created_at)} />
              {detail.reviewed_at && <Field label={t('roleAppPage.reviewedDate')} value={formatDateTime(detail.reviewed_at)} />}
              {detail.reviewed_by_name && <Field label={t('roleAppPage.reviewer')} value={detail.reviewed_by_name} />}
            </div>

            {detail.role_type === 'organization_owner' && (
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label={t('roleAppPage.orgName')} value={detail.org_name} />
                <Field label={t('roleAppPage.orgType')} value={detail.org_type} />
                <Field label={t('roleAppPage.validityTill')} value={detail.validity_till ? formatDate(detail.validity_till) : ''} />
                <Field label={t('roleAppPage.orgPhone')} value={detail.org_phone} />
                <Field label={t('roleAppPage.address')} value={[detail.location_text, detail.upazilla, detail.district, detail.division, detail.post_code].filter(Boolean).join(', ')} />
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-3">
              {detail.document_url && (
                <a href={detail.document_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  {t('roleAppPage.viewDocument')}
                </a>
              )}
              {detail.facility_photo_url && (
                <a href={detail.facility_photo_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {t('roleAppPage.viewFacilityPhoto')}
                </a>
              )}
            </div>

            {detail.status === 'Rejected' && detail.rejection_reason && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{detail.rejection_reason}</span>
              </div>
            )}

            {detail.status === 'Pending' && (
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => { setRejectTarget(detail); setRejectReason('') }}>
                  <X className="w-3.5 h-3.5" />
                  {t('roleAppPage.reject')}
                </Button>
                <Button onClick={() => approveMutation.mutate(detail.id)} loading={approveMutation.isPending}>
                  <Check className="w-3.5 h-3.5" />
                  {t('roleAppPage.approve')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject modal (reason required) ──────────────────────────────── */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t('roleAppPage.rejectTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t('roleAppPage.rejectConfirm', { name: rejectTarget?.applicant_name ?? '' })}
          </p>
          <Input
            label={t('roleAppPage.rejectReasonLabel')}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder={t('roleAppPage.rejectReasonPlaceholder')}
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
              loading={rejectMutation.isPending}
            >
              {t('roleAppPage.reject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-slate-800 mt-0.5">{value || <span className="text-slate-400">{t('roleAppPage.noneShort')}</span>}</p>
    </div>
  )
}
