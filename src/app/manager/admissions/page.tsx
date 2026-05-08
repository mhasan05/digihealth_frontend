"use client"

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { BedDouble, Eye, User, Stethoscope, Calendar, Clock, Banknote } from 'lucide-react'
import type { Admission, Appointment } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAdmitted(admittedAt: string, dischargedAt?: string): number {
  const from = new Date(admittedAt).getTime()
  const to   = dischargedAt ? new Date(dischargedAt).getTime() : Date.now()
  return Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)))
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function AdmissionDetailModal({
  admission,
  appointment,
  onClose,
}: {
  admission: Admission | null
  appointment: Appointment | undefined
  onClose: () => void
}) {
  if (!admission) return null

  const isActive = !admission.discharged_at
  const days     = daysAdmitted(admission.admitted_at, admission.discharged_at)
  const total    = days * admission.bed_price_snapshot

  return (
    <Modal isOpen={!!admission} onClose={onClose} title="ভর্তির বিস্তারিত" size="sm">
      <div className="space-y-5">

        {/* Patient header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900 truncate">{admission.patient_name}</p>
            {appointment && (
              <p className="text-xs text-slate-500 mt-0.5">{appointment.reason}</p>
            )}
          </div>
          <Badge variant={isActive ? 'green' : 'gray'}>
            {isActive ? 'ভর্তি' : 'ছাড়প্রাপ্ত'}
          </Badge>
        </div>

        {/* Appointment info */}
        {appointment && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ডাক্তার ও অ্যাপয়েন্টমেন্ট</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 bg-violet-50 rounded-xl">
                <Stethoscope className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">ডাক্তার</p>
                  <p className="text-sm font-semibold text-slate-800">{appointment.doctor_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl">
                <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">অ্যাপয়েন্টমেন্ট</p>
                  <p className="text-sm font-semibold text-slate-800">{appointment.date}</p>
                  <p className="text-xs text-slate-500">{appointment.time}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admission info */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ভর্তি তথ্য</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <BedDouble className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">বেড</p>
                <p className="text-sm font-semibold text-slate-800">{admission.bed_number}</p>
                <p className="text-xs text-slate-500">{admission.ward}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <User className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">নার্স</p>
                <p className="text-sm font-semibold text-slate-800">{admission.nurse_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium">ভর্তির সময়</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(admission.admitted_at)}</p>
              </div>
            </div>
            {admission.discharged_at && (
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">ছাড়ের সময়</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(admission.discharged_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">আর্থিক সারসংক্ষেপ</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">বেড ভাড়া (প্রতিদিন)</span>
              <span className="text-sm font-semibold text-slate-800">{formatCurrency(admission.bed_price_snapshot)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">মোট দিন</span>
              <span className="text-sm font-semibold text-slate-800">{days} দিন</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-green-50">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-green-800">
                  {isActive ? 'আনুমানিক মোট খরচ' : 'মোট বিল'}
                </span>
              </div>
              <span className="text-base font-extrabold text-green-700">{formatCurrency(total)}</span>
            </div>
          </div>
          {isActive && (
            <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
              * রোগী ভর্তি থাকায় খরচ প্রতিদিন বাড়ছে
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>বন্ধ করুন</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdmissionsPage() {
  const { user }    = useAuthStore()
  const hospitalId  = user?.active_hospital_id ?? 'h1'
  const [viewAdmission, setViewAdmission] = useState<Admission | null>(null)

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn:  () => api.manager.getAdmissions(),
  })

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', hospitalId],
    queryFn:  () => api.manager.getAppointments(hospitalId),
  })

  const getAppointment = (id: string) => appointments.find(a => a.id === id)

  const { current, discharged } = useMemo(() => ({
    current:    admissions.filter(a => !a.discharged_at),
    discharged: admissions.filter(a => !!a.discharged_at),
  }), [admissions])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">ভর্তি ব্যবস্থাপনা</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          বর্তমানে ভর্তি {current.length}জন | ছাড়প্রাপ্ত {discharged.length}জন
        </p>
      </div>

      {/* Currently admitted */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">বর্তমানে ভর্তি রোগী</h3>
        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHead columns={['রোগীর নাম', 'বেড', 'ওয়ার্ড', 'নার্স', 'ভর্তির সময়', 'মূল্য/দিন', 'স্ট্যাটাস', '']} />
            <TableBody isEmpty={current.length === 0} emptyMessage="বর্তমানে কোনো ভর্তি রোগী নেই" colSpan={8}>
              {current.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><span className="font-medium">{a.patient_name}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-slate-400" />
                      {a.bed_number}
                    </div>
                  </TableCell>
                  <TableCell>{a.ward}</TableCell>
                  <TableCell>{a.nurse_name}</TableCell>
                  <TableCell>{formatDateTime(a.admitted_at)}</TableCell>
                  <TableCell>{formatCurrency(a.bed_price_snapshot)}</TableCell>
                  <TableCell><Badge variant="green">ভর্তি</Badge></TableCell>
                  <TableCell>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="বিস্তারিত দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3">
          {current.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
              বর্তমানে কোনো ভর্তি রোগী নেই
            </div>
          ) : (
            current.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.patient_name}</p>
                    <p className="text-sm text-slate-500">বেড {a.bed_number} | {a.ward}</p>
                    <p className="text-sm text-slate-500">নার্স: {a.nurse_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(a.admitted_at)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(a.bed_price_snapshot)}/দিন</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="green">ভর্তি</Badge>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Discharged */}
      {discharged.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3">ছাড়প্রাপ্ত রোগী</h3>
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHead columns={['রোগীর নাম', 'বেড', 'ওয়ার্ড', 'ভর্তির সময়', 'ছাড়ের সময়', 'স্ট্যাটাস', '']} />
              <TableBody isEmpty={false} emptyMessage="" colSpan={7}>
                {discharged.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><span className="font-medium">{a.patient_name}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        {a.bed_number}
                      </div>
                    </TableCell>
                    <TableCell>{a.ward}</TableCell>
                    <TableCell>{formatDateTime(a.admitted_at)}</TableCell>
                    <TableCell>{a.discharged_at ? formatDateTime(a.discharged_at) : '—'}</TableCell>
                    <TableCell><Badge variant="gray">ছাড়প্রাপ্ত</Badge></TableCell>
                    <TableCell>
                      <button
                        onClick={() => setViewAdmission(a)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {discharged.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{a.patient_name}</p>
                    <p className="text-sm text-slate-500">বেড {a.bed_number} | {a.ward}</p>
                    <p className="text-xs text-slate-400 mt-1">ভর্তি: {formatDateTime(a.admitted_at)}</p>
                    {a.discharged_at && (
                      <p className="text-xs text-slate-400">ছাড়: {formatDateTime(a.discharged_at)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="gray">ছাড়প্রাপ্ত</Badge>
                    <button
                      onClick={() => setViewAdmission(a)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <AdmissionDetailModal
        admission={viewAdmission}
        appointment={viewAdmission ? getAppointment(viewAdmission.appointment_id) : undefined}
        onClose={() => setViewAdmission(null)}
      />
    </div>
  )
}
