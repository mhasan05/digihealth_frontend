"use client"

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import {
  ArrowLeft, User, Phone, Droplets, MapPin, Calendar,
  AlertTriangle, ShieldCheck, FileText, Eye, Download, HeartPulse,
} from 'lucide-react'
import { PATIENT_CONDITIONS, type PatientCondition } from '@/types'

export default function DoctorPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslation()
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [confirmFlip, setConfirmFlip] = useState<'Positive' | 'Negative' | null>(null)

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['doctor-patient', id],
    queryFn: () => api.doctor.getPatient(id),
    retry: false,
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['doctor-patient-reports', id],
    queryFn: () => api.doctor.listReports(id),
    enabled: !!patient,
  })

  // Log a single 'searched' event per visit to this patient page.
  const loggedSearchRef = useRef(false)
  useEffect(() => {
    if (patient && !loggedSearchRef.current) {
      loggedSearchRef.current = true
      api.doctor.logAccess(id, 'searched').catch(() => { /* fire-and-forget */ })
    }
  }, [patient, id])

  const flipMutation = useMutation({
    mutationFn: (next: 'Positive' | 'Negative') => api.doctor.setHivStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patient', id] })
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-search'] })
      setConfirmFlip(null)
    },
  })

  const logView = (reportId: string) => {
    api.doctor.logAccess(id, 'viewed', reportId).catch(() => {})
  }
  const logDownload = (reportId: string) => {
    api.doctor.logAccess(id, 'downloaded', reportId).catch(() => {})
  }

  if (isLoading) return <LoadingSpinner />
  if (!patient) {
    return (
      <div className="space-y-4">
        <Link href="/doctor/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          {t('doctorPatientDetail.backToSearch')}
        </Link>
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {error instanceof Error ? error.message : t('doctorPatientDetail.notFound')}
          </p>
        </div>
      </div>
    )
  }

  const isPositive = patient.hiv_status === 'Positive'
  const cardClasses = isPositive
    ? 'bg-gradient-to-br from-red-50 to-indigo-50 border-red-300'
    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
  const accent = isPositive ? 'text-red-600' : 'text-green-600'
  const accentBg = isPositive ? 'bg-red-100' : 'bg-green-100'

  const genderLabel = patient.gender === 'Male' ? t('patient.male') : patient.gender === 'Female' ? t('patient.female') : t('patient.other')

  return (
    <div className="space-y-6">
      <Link href="/doctor/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        {t('doctorPatientDetail.backToSearch')}
      </Link>

      {/* Patient card — color reflects HIV status */}
      <div className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${cardClasses}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${accentBg}`}>
                <User className={`w-7 h-7 ${accent}`} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{patient.name}</h2>
                <p className="text-xs font-mono text-slate-500 mt-1 tracking-widest">{patient.health_id}</p>
                <span className={`inline-flex items-center gap-1.5 mt-3 text-xs font-bold px-3 py-1 rounded-full ring-1 ${
                  isPositive
                    ? 'bg-red-100 text-red-800 ring-red-300'
                    : 'bg-green-100 text-green-800 ring-green-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-red-500' : 'bg-green-500'}`} />
                  HIV: {isPositive ? 'Positive' : 'Negative'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {isPositive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmFlip('Negative')}
                  loading={flipMutation.isPending && confirmFlip === 'Negative'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('doctorPatientDetail.markAsNegative')}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmFlip('Positive')}
                  loading={flipMutation.isPending && confirmFlip === 'Positive'}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t('doctorPatientDetail.markAsPositive')}
                </Button>
              )}
            </div>
          </div>

          {/* Demographic tiles */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile icon={Calendar} label={t('doctorPatientDetail.ageGender')} value={`${patient.age} ${t('doctorPatientDetail.yearsOld')}`} sub={genderLabel} />
            <Tile icon={Droplets} label={t('doctorPatientDetail.bloodGroup')} value={patient.blood_group || 'Unknown'} valueClass="text-red-600 font-extrabold" />
            <Tile icon={Phone} label={t('doctorPatientDetail.phone')} value={patient.phone ?? t('doctorPatientDetail.noneShort')} />
            <Tile icon={MapPin} label={t('doctorPatientDetail.address')} value={patient.address || t('doctorPatientDetail.noneShort')} />
          </div>

          {/* Self-reported chronic conditions */}
          <ConditionBadges conditions={(patient.conditions ?? []) as PatientCondition[]} />
        </div>
      </div>

      {/* Reports */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900">{t('doctorPatientDetail.medicalReports')}</h3>
          <span className="text-xs text-slate-400 ml-auto">{t('doctorPatientDetail.reportsCount', { count: reports.length })}</span>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">{t('doctorPatientDetail.noReports')}</p>
        ) : (
          <ul className="space-y-2">
            {reports
              .slice()
              .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
              .map(r => (
                <li key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate" title={r.name}>{r.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatFileSize(r.size)} · {formatDateTime(r.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logView(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t('doctorPatientDetail.view')}
                    </a>
                    <a
                      href={r.file_url}
                      download={r.name}
                      onClick={() => logDownload(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('doctorPatientDetail.download')}
                    </a>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmFlip}
        onClose={() => setConfirmFlip(null)}
        onConfirm={() => confirmFlip && flipMutation.mutate(confirmFlip)}
        title={confirmFlip === 'Positive' ? t('doctorPatientDetail.confirmPositiveTitle') : t('doctorPatientDetail.confirmNegativeTitle')}
        message={
          confirmFlip === 'Positive'
            ? t('doctorPatientDetail.confirmPositiveMessage', { name: patient.name })
            : t('doctorPatientDetail.confirmNegativeMessage', { name: patient.name })
        }
        tone={confirmFlip === 'Positive' ? 'warning' : 'primary'}
        confirmLabel={t('doctorPatientDetail.confirm')}
        isLoading={flipMutation.isPending}
      />
    </div>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-white/70 backdrop-blur rounded-xl border border-white/60">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm mt-0.5 truncate ${valueClass ?? 'font-bold text-slate-800'}`}>{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function ConditionBadges({ conditions }: { conditions: PatientCondition[] }) {
  const { t } = useTranslation()
  if (conditions.length === 0) {
    return (
      <div className="mt-5 flex items-center gap-2 px-3 py-2.5 bg-white/70 backdrop-blur rounded-xl border border-white/60 text-xs text-slate-500">
        <HeartPulse className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {t('doctorPatientDetail.noConditionsReported')}
      </div>
    )
  }
  return (
    <div className="mt-5 px-3 py-3 bg-white/70 backdrop-blur rounded-xl border border-white/60">
      <div className="flex items-center gap-2 mb-2">
        <HeartPulse className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t('doctorPatientDetail.longTermConditions')}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PATIENT_CONDITIONS.filter(c => conditions.includes(c.value)).map(c => (
          <span
            key={c.value}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-300"
          >
            {t(c.labelKey)}
          </span>
        ))}
      </div>
    </div>
  )
}

