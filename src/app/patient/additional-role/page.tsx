"use client"

import { useState } from 'react'
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
  Plus, Stethoscope, Activity, ClipboardList, HeartPulse, Building2,
  Upload, FileText, AlertTriangle, ArrowLeft, Clock,
} from 'lucide-react'
import { ROLE_APPLICATION_TYPES, type RoleApplicationType, type RoleApplication, type OrgType } from '@/types'

const ROLE_ICONS: Record<RoleApplicationType, React.ElementType> = {
  doctor: Stethoscope,
  nurse: Activity,
  medical_assistant: ClipboardList,
  midwife: HeartPulse,
  organization_owner: Building2,
}

const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: 'Diagnostic', label: 'ডায়াগনস্টিক' },
  { value: 'Clinic', label: 'ক্লিনিক' },
  { value: 'Hospital', label: 'হাসপাতাল' },
]

export default function AdditionalRolePage() {
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
          <h2 className="text-xl font-bold text-slate-900">অতিরিক্ত ভূমিকার আবেদন</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ডাক্তার, নার্স, মেডিকেল অ্যাসিস্ট্যান্ট, মিডওয়াইফ বা প্রতিষ্ঠান মালিক হিসেবে আবেদন করুন।
          </p>
        </div>
        <Button onClick={openApply}>
          <Plus className="w-4 h-4" />
          নতুন আবেদন
        </Button>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">এখনো কোনো আবেদন করেননি।</p>
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
        title={selectedType ? ROLE_APPLICATION_TYPES.find(r => r.value === selectedType)?.label ?? '' : 'ভূমিকা নির্বাচন করুন'}
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
                    <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                    {alreadyPending && (
                      <p className="text-xs text-amber-600 mt-0.5">ইতিমধ্যে একটি আবেদন অপেক্ষমান আছে</p>
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
  const Icon = ROLE_ICONS[app.role_type]
  const label = ROLE_APPLICATION_TYPES.find(r => r.value === app.role_type)?.label ?? app.role_type
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
          আবেদনের তারিখ: {formatDate(app.created_at)}
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
            অনুমোদিত হয়েছে — কোনো প্রতিষ্ঠানের মালিক আপনাকে যুক্ত করলে সংশ্লিষ্ট প্যানেলে দেখা যাবে।
          </p>
        )}
        {app.status === 'Approved' && app.role_type === 'organization_owner' && (
          <p className="text-xs text-green-600 mt-2">অনুমোদিত হয়েছে — আপনার প্রতিষ্ঠান তৈরি করা হয়েছে।</p>
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

    if (!registrationNumber.trim()) return setLocalError('রেজিস্ট্রেশন/লাইসেন্স নম্বর দিন।')
    if (!document) return setLocalError('প্রমাণপত্র আপলোড করুন।')
    if (isOrg) {
      if (!orgName.trim()) return setLocalError('প্রতিষ্ঠানের নাম দিন।')
      if (!orgType) return setLocalError('প্রতিষ্ঠানের ধরন নির্বাচন করুন।')
      if (!validityTill) return setLocalError('মেয়াদ শেষের তারিখ দিন।')
      if (!orgPhone.trim()) return setLocalError('প্রতিষ্ঠানের ফোন নম্বর দিন।')
      if (!upazilla.trim() || !district.trim() || !division.trim()) return setLocalError('উপজেলা, জেলা ও বিভাগ দিন।')
      if (!facilityPhoto) return setLocalError('প্রতিষ্ঠানের ছবি আপলোড করুন।')
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
        label={isOrg ? 'প্রতিষ্ঠানের রেজিস্ট্রেশন নম্বর' : 'রেজিস্ট্রেশন/লাইসেন্স নম্বর'}
        value={registrationNumber}
        onChange={e => setRegistrationNumber(e.target.value)}
        placeholder="যেমন: A-12345"
      />
      <FileField
        label={isOrg ? 'রেজিস্ট্রেশনের ছবি আপলোড করুন' : 'প্রমাণপত্র আপলোড করুন'}
        file={document}
        onChange={setDocument}
      />

      {isOrg && (
        <>
          <div className="pt-1 border-t border-slate-100" />
          <Input label="প্রতিষ্ঠানের নাম" value={orgName} onChange={e => setOrgName(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="ধরন"
              value={orgType}
              onChange={e => setOrgType(e.target.value as OrgType | '')}
              options={[{ value: '', label: 'নির্বাচন করুন' }, ...ORG_TYPE_OPTIONS]}
            />
            <Input
              label="মেয়াদ শেষের তারিখ"
              type="date"
              value={validityTill}
              onChange={e => setValidityTill(e.target.value)}
            />
          </div>
          <Input label="প্রতিষ্ঠানের ফোন নম্বর" value={orgPhone} onChange={e => setOrgPhone(e.target.value)} />
          <Input
            label="ঠিকানা (ঐচ্ছিক বিস্তারিত)"
            value={locationText}
            onChange={e => setLocationText(e.target.value)}
            placeholder="যেমন: রোড ৫, বাড়ি ১২"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="উপজেলা" value={upazilla} onChange={e => setUpazilla(e.target.value)} />
            <Input label="জেলা" value={district} onChange={e => setDistrict(e.target.value)} />
            <Input label="বিভাগ" value={division} onChange={e => setDivision(e.target.value)} />
          </div>
          <Input label="পোস্ট কোড (ঐচ্ছিক)" value={postCode} onChange={e => setPostCode(e.target.value)} />
          <FileField label="প্রতিষ্ঠানের ছবি আপলোড করুন" file={facilityPhoto} onChange={setFacilityPhoto} />
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
          পিছনে
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>বাতিল</Button>
          <Button type="submit" loading={isSubmitting}>আবেদন জমা দিন</Button>
        </div>
      </div>
    </form>
  )
}

function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-colors">
        {file ? <FileText className="w-5 h-5 text-green-600 flex-shrink-0" /> : <Upload className="w-5 h-5 text-slate-400 flex-shrink-0" />}
        <span className="text-sm text-slate-600 truncate">{file ? file.name : 'ফাইল বেছে নিন (JPG, PNG বা PDF)'}</span>
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
