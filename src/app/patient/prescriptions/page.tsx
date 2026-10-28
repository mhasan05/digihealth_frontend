"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { FieldPrescriptionCard } from '@/components/shared/field-prescription-card'
import { Flag, ScrollText, AlertTriangle } from 'lucide-react'
import type { FieldPrescription } from '@/types'

export default function PatientPrescriptionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [disputeRx, setDisputeRx] = useState<FieldPrescription | null>(null)
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patient-field-prescriptions'],
    queryFn: () => api.patient.getFieldPrescriptions(),
  })

  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patient.disputeFieldPrescription(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-field-prescriptions'] })
      closeDispute()
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const closeDispute = () => {
    setDisputeRx(null)
    setReason('')
    setErrorMsg(null)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t('nav.prescriptions')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('patientRx.subtitle', { count: prescriptions.length })}</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card className="py-16 text-center">
          <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('patientRx.empty')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('patientRx.emptyHint')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {prescriptions.map(rx => (
            <FieldPrescriptionCard key={rx.id} rx={rx}>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDisputeRx(rx)}>
                  <Flag className="w-3.5 h-3.5" />
                  {t('patientRx.notMine')}
                </Button>
              </div>
            </FieldPrescriptionCard>
          ))}
        </div>
      )}

      <Modal isOpen={!!disputeRx} onClose={closeDispute} title={t('patientRx.disputeTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('patientRx.disputeMessage')}</p>
          <div>
            <label htmlFor="dispute-reason" className="block text-sm font-semibold text-slate-700 mb-1.5">
              {t('patientRx.reasonOptional')}
            </label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeDispute}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={disputeMutation.isPending}
              onClick={() => disputeRx && disputeMutation.mutate({ id: disputeRx.id, reason: reason.trim() })}
            >
              {t('patientRx.disputeConfirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
