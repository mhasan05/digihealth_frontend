"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import {
  Plus, Stethoscope, Activity, ClipboardList, HeartPulse, Building2, Microscope,
  Upload, FileText, AlertTriangle, ArrowLeft, Clock,
} from 'lucide-react'
import { ROLE_APPLICATION_TYPES, type RoleApplicationType, type RoleApplication, type OrgType } from '@/types'

const ROLE_ICONS: Record<RoleApplicationType, React.ElementType> = {
  doctor: Stethoscope,
  nurse: Activity,
  medical_assistant: ClipboardList,
  pathologist: Microscope,
  midwife: HeartPulse,
  organization_owner: Building2,
}

const ORG_TYPE_OPTIONS: { value: OrgType; labelKey: string }[] = [
  { value: 'Diagnostic', labelKey: 'orgType.diagnostic' },
  { value: 'Clinic', labelKey: 'orgType.clinic' },
  { value: 'Hospital', labelKey: 'orgType.hospital' },
]

export default function AdditionalRolePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [applyOpen, setApplyOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<RoleApplicationType | null>(null)

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['role-applications'],
    queryFn: api.patient.getRoleApplications,
  })

  const submitMutation = useMutation({
    mutationFn: (fd: FormData) => api.patient.submitRoleApplication(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-applications'] })
      closeApply()
    },
  })

  const openApply = () => { setSelectedType(null); setApplyOpen(true) }
  const closeApply = () => { setApplyOpen(false); setSelectedType(null) }

  const pendingTypes = new Set(applications.filter(a => a.status === 'Pending').map(a => a.role_type))

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('additionalRole.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('additionalRole.subtitle')}
          </p>
        </div>
        <Button onClick={openApply}>
          <Plus className="w-4 h-4" />
          {t('additionalRole.newApplication')}
        </Button>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('additionalRole.noApplicationsYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

      <Modal
        isOpen={applyOpen}
        onClose={closeApply}
        title={selectedType ? (() => {
          const key = ROLE_APPLICATION_TYPES.find(r => r.value === selectedType)?.labelKey
          return key ? t(key) : ''
        })() : t('additionalRole.selectRole')}
        size="md"
      >
        {!selectedType ? (
          <div className="space-y-2">
            {ROLE_APPLICATION_TYPES.map(r => {
              const Icon = ROLE_ICONS[r.value]
              const alreadyPending = pendingTypes.has(r.value)
              return (
                <button
                  key={r.value}
                  type="button"
                  disabled={alreadyPending}
                  onClick={() => setSelectedType(r.value)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200"
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t(r.labelKey)}</p>
                    {alreadyPending && (
                      <p className="text-xs text-amber-600 mt-0.5">{t('additionalRole.alreadyPending')}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <ApplicationForm
            roleType={selectedType}
            onBack={() => setSelectedType(null)}
            onCancel={closeApply}
            onSubmit={fd => submitMutation.mutate(fd)}
            isSubmitting={submitMutation.isPending}
            errorMsg={submitMutation.error instanceof Error ? submitMutation.error.message : null}
          />
        )}
      </Modal>
    </div>
  )
}

// ─── Application status card ───────────────────────────────────────────────────

function ApplicationCard({ application: app }: { application: RoleApplication }) {
  const { t } = useTranslation()
  const Icon = ROLE_ICONS[app.role_type]
  const labelKey = ROLE_APPLICATION_TYPES.find(r => r.value === app.role_type)?.labelKey
  const label = labelKey ? t(labelKey) : app.role_type
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t('additionalRole.appliedOn')}: {formatDate(app.created_at)}
        </p>
        {app.role_type === 'organization_owner' && app.org_name && (
          <p className="text-xs text-slate-500 mt-1">{app.org_name} · {app.org_type}</p>
        )}
        {app.status === 'Rejected' && app.rejection_reason && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{app.rejection_reason}</span>
          </div>
        )}
        {app.status === 'Approved' && app.role_type !== 'organization_owner' && (
          <p className="text-xs text-green-600 mt-2">
            {t('additionalRole.approvedStaffHint')}
          </p>
        )}
        {app.status === 'Approved' && app.role_type === 'organization_owner' && (
          <p className="text-xs text-green-600 mt-2">{t('additionalRole.approvedOrgHint')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Application form (shape depends on role type) ─────────────────────────────

function ApplicationForm({
  roleType, onBack, onCancel, onSubmit, isSubmitting, errorMsg,
}: {
  roleType: RoleApplicationType
  onBack: () => void
  onCancel: () => void
  onSubmit: (fd: FormData) => void
  isSubmitting: boolean
  errorMsg: string | null
}) {
  const { t } = useTranslation()
  const isOrg = roleType === 'organization_owner'

  const [registrationNumber, setRegistrationNumber] = useState('')
  const [document, setDocument] = useState<File | null>(null)

  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<OrgType | ''>('')
  const [validityTill, setValidityTill] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [locationText, setLocationText] = useState('')
  const [upazilla, setUpazilla] = useState('')
  const [district, setDistrict] = useState('')
  const [division, setDivision] = useState('')
  const [postCode, setPostCode] = useState('')
  const [facilityPhoto, setFacilityPhoto] = useState<File | null>(null)

  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!registrationNumber.trim()) return setLocalError(t('additionalRole.errorRegistrationNumber'))
    if (!document) return setLocalError(t('additionalRole.errorDocument'))
    if (isOrg) {
      if (!orgName.trim()) return setLocalError(t('additionalRole.errorOrgName'))
      if (!orgType) return setLocalError(t('additionalRole.errorOrgType'))
      if (!validityTill) return setLocalError(t('additionalRole.errorValidityTill'))
      if (!orgPhone.trim()) return setLocalError(t('additionalRole.errorOrgPhone'))
      if (!upazilla.trim() || !district.trim() || !division.trim()) return setLocalError(t('additionalRole.errorLocation'))
      if (!facilityPhoto) return setLocalError(t('additionalRole.errorFacilityPhoto'))
    }

    const fd = new FormData()
    fd.append('role_type', roleType)
    fd.append('registration_number', registrationNumber.trim())
    fd.append('document', document)
    if (isOrg) {
      fd.append('org_name', orgName.trim())
      fd.append('org_type', orgType)
      fd.append('validity_till', validityTill)
      fd.append('org_phone', orgPhone.trim())
      fd.append('location_text', locationText.trim())
      fd.append('upazilla', upazilla.trim())
      fd.append('district', district.trim())
      fd.append('division', division.trim())
      fd.append('post_code', postCode.trim())
      fd.append('facility_photo', facilityPhoto!)
    }
    onSubmit(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={isOrg ? t('additionalRole.orgRegistrationNumberLabel') : t('additionalRole.registrationNumberLabel')}
        value={registrationNumber}
        onChange={e => setRegistrationNumber(e.target.value)}
        placeholder={t('additionalRole.registrationNumberPlaceholder')}
      />
      <FileField
        label={isOrg ? t('additionalRole.orgRegistrationPhotoLabel') : t('additionalRole.documentLabel')}
        file={document}
        onChange={setDocument}
      />

      {isOrg && (
        <>
          <div className="pt-1 border-t border-slate-100" />
          <Input label={t('additionalRole.orgNameLabel')} value={orgName} onChange={e => setOrgName(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t('hospital.type')}
              value={orgType}
              onChange={e => setOrgType(e.target.value as OrgType | '')}
              options={[{ value: '', label: t('additionalRole.selectPlaceholder') }, ...ORG_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))]}
            />
            <Input
              label={t('additionalRole.validityTillLabel')}
              type="date"
              value={validityTill}
              onChange={e => setValidityTill(e.target.value)}
            />
          </div>
          <Input label={t('additionalRole.orgPhoneLabel')} value={orgPhone} onChange={e => setOrgPhone(e.target.value)} />
          <Input
            label={t('additionalRole.addressDetailLabel')}
            value={locationText}
            onChange={e => setLocationText(e.target.value)}
            placeholder={t('additionalRole.addressPlaceholder')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label={t('additionalRole.upazillaLabel')} value={upazilla} onChange={e => setUpazilla(e.target.value)} />
            <Input label={t('additionalRole.districtLabel')} value={district} onChange={e => setDistrict(e.target.value)} />
            <Input label={t('additionalRole.divisionLabel')} value={division} onChange={e => setDivision(e.target.value)} />
          </div>
          <Input label={t('additionalRole.postCodeLabel')} value={postCode} onChange={e => setPostCode(e.target.value)} />
          <FileField label={t('additionalRole.facilityPhotoLabel')} file={facilityPhoto} onChange={setFacilityPhoto} />
        </>
      )}

      {(localError || errorMsg) && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{localError ?? errorMsg}</span>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('additionalRole.back')}
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" loading={isSubmitting}>{t('additionalRole.submitApplication')}</Button>
        </div>
      </div>
    </form>
  )
}

function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-colors">
        {file ? <FileText className="w-5 h-5 text-green-600 flex-shrink-0" /> : <Upload className="w-5 h-5 text-slate-400 flex-shrink-0" />}
        <span className="text-sm text-slate-600 truncate">{file ? file.name : t('additionalRole.chooseFileHint')}</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={e => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  )
}
