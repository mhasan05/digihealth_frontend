"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { FieldPrescriptionCard } from '@/components/shared/field-prescription-card'
import { AlertTriangle, PhoneCall, RotateCcw, ScrollText, UserCheck } from 'lucide-react'
import type { AdminFieldPrescription, FieldPrescriptionStatus } from '@/types'

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/

const STATUS_VARIANT: Record<FieldPrescriptionStatus, 'green' | 'amber' | 'red'> = {
  claimed: 'green',
  unclaimed: 'amber',
  disputed: 'red',
}

export default function AdminFieldPrescriptionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<FieldPrescriptionStatus | ''>('')
  const [phone, setPhone] = useState('')
  const [staffId, setStaffId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fixRx, setFixRx] = useState<AdminFieldPrescription | null>(null)
  const [newPhone, setNewPhone] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filters = { status: status || undefined, phone: phone.trim() || undefined, staff: staffId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['admin-field-prescriptions', filters],
    queryFn: () => api.admin.getFieldPrescriptions(filters),
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['admin-field-staff'],
    queryFn: () => api.admin.getFieldStaff(),
  })

  const counts = useMemo(() => {
    const c: Record<FieldPrescriptionStatus, number> = { claimed: 0, unclaimed: 0, disputed: 0 }
    for (const rx of prescriptions) c[rx.status]++
    return c
  }, [prescriptions])

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { phone?: string; status?: 'unclaimed' } }) =>
      api.admin.updateFieldPrescription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-field-prescriptions'] })
      closeFix()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const openFix = (rx: AdminFieldPrescription) => {
    setFixRx(rx)
    setNewPhone(rx.phone)
    setErrorMsg(null)
  }

  const closeFix = () => {
    setFixRx(null)
    setNewPhone('')
    setErrorMsg(null)
  }

  const submitFix = () => {
    if (!fixRx) return
    if (!BD_MOBILE.test(newPhone.replace(/[\s-]/g, ''))) {
      setErrorMsg(t('fieldStaffPage.phoneInvalid'))
      return
    }
    updateMutation.mutate({ id: fixRx.id, data: { phone: newPhone } })
  }

  const statusLabel = (s: FieldPrescriptionStatus) => t(`fieldRx.status.${s}`)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t('fieldRxPage.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('fieldRxPage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['unclaimed', 'claimed', 'disputed'] as FieldPrescriptionStatus[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(prev => (prev === s ? '' : s))}
            className={`text-left rounded-xl border p-3 sm:p-4 transition-all ${
              status === s ? 'border-green-500 ring-2 ring-green-500/20 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{statusLabel(s)}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts[s]}</p>
          </button>
        ))}
      </div>

      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input label={t('common.phone')} placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
          <Select
            label={t('common.status')}
            value={status}
            onChange={e => setStatus(e.target.value as FieldPrescriptionStatus | '')}
            options={[
              { value: '', label: t('common.all') },
              { value: 'unclaimed', label: statusLabel('unclaimed') },
              { value: 'claimed', label: statusLabel('claimed') },
              { value: 'disputed', label: statusLabel('disputed') },
            ]}
          />
          <Select
            label={t('fieldRxPage.staff')}
            value={staffId}
            onChange={e => setStaffId(e.target.value)}
            options={[{ value: '', label: t('common.all') }, ...staff.map(s => ({ value: s.id, label: s.name }))]}
          />
          <Input type="date" label={t('fieldRxPage.from')} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" label={t('fieldRxPage.to')} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner />
      ) : prescriptions.length === 0 ? (
        <Card className="py-16 text-center">
          <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('fieldRxPage.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {prescriptions.map(rx => (
            <FieldPrescriptionCard
              key={rx.id}
              rx={rx}
              showPhone
              badge={<Badge variant={STATUS_VARIANT[rx.status]} dot>{statusLabel(rx.status)}</Badge>}
            >
              {rx.status === 'claimed' && rx.patient_account_name && (
                <p className="text-xs text-green-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  {t('fieldRxPage.linkedTo', { name: rx.patient_account_name })}
                </p>
              )}
              {rx.status === 'disputed' && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  <p className="font-semibold">{t('fieldRxPage.disputedNote')}</p>
                  {rx.dispute_reason && <p className="mt-0.5">“{rx.dispute_reason}”</p>}
                </div>
              )}
              <div className="flex justify-end gap-2">
                {rx.status === 'disputed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={updateMutation.isPending && updateMutation.variables?.id === rx.id && !fixRx}
                    onClick={() => updateMutation.mutate({ id: rx.id, data: { status: 'unclaimed' } })}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('fieldRxPage.returnToUnclaimed')}
                  </Button>
                )}
                <Button variant="soft" size="sm" onClick={() => openFix(rx)}>
                  <PhoneCall className="w-3.5 h-3.5" />
                  {t('fieldRxPage.fixPhone')}
                </Button>
              </div>
            </FieldPrescriptionCard>
          ))}
        </div>
      )}

      <Modal isOpen={!!fixRx} onClose={closeFix} title={t('fieldRxPage.fixPhoneTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('fieldRxPage.fixPhoneMessage')}</p>
          <Input label={t('common.phone')} value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeFix}>{t('common.cancel')}</Button>
            <Button loading={updateMutation.isPending} onClick={submitFix}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
