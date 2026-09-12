"use client"

import { useState, useMemo } from 'react'
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
import { StatusBadge } from '@/components/ui/badge'
import { QRHealthId } from '@/components/shared/qr-health-id'
import { StatCard } from '@/components/shared/stat-card'
import { formatDate, formatDateTime, formatFileSize } from '@/lib/utils'
import {
  Plus, Pencil, Trash2, User,
  TrendingUp, TrendingDown, Minus, Activity, Heart, Scale,
  Crown, ChevronDown, Upload, Download, FileText,
  AlertTriangle, Star, Eye, Share2, ShieldCheck, Search,
  UserCheck, Microscope, Building2, Lock, Globe, Calendar, HeartPulse,
} from 'lucide-react'
import { PATIENT_CONDITIONS, type PatientCondition } from '@/types'
import type { HealthMetric, Role } from '@/types'

const isImageFile = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
const isPdfFile   = (name: string) => /\.pdf$/i.test(name)

// ── Constants ─────────────────────────────────────────────────────────────────
const PATIENT_ID = 'pt1'
const MAX_FREE   = 10
const IS_PREMIUM = false

// ── Schemas ───────────────────────────────────────────────────────────────────
const rbsSchema    = z.object({ value: z.coerce.number().min(40).max(600), date: z.string().min(1) })
const bpSchema     = z.object({ value: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'ফরম্যাট: ১২০/৮০'), date: z.string().min(1) })
const weightSchema = z.object({ value: z.coerce.number().min(1).max(300), date: z.string().min(1) })

type MetricType = 'rbs' | 'blood_pressure' | 'weight'
interface MetricModalState { isOpen: boolean; type: MetricType; editing?: HealthMetric }

// ── Metric config ─────────────────────────────────────────────────────────────
const metricConfig: Record<MetricType, {
  label: string; unit: string; svgColor: string
  accentBg: string; accentText: string; accentBorder: string; dotBg: string
  icon: React.ElementType
  toNumber: (v: string) => number
  status: (n: number) => { label: string; cls: string } | null
  goodTrend: 'down' | 'up' | 'neutral'
  placeholder: string
}> = {
  rbs: {
    label: 'RBS', unit: 'mg/dL', svgColor: '#0ea5e9',
    accentBg: 'bg-green-50', accentText: 'text-green-600', accentBorder: 'border-green-200', dotBg: 'bg-green-100',
    icon: Activity, toNumber: v => parseFloat(v),
    status: n => n < 140 ? { label: 'স্বাভাবিক', cls: 'bg-green-100 text-green-700' }
               : n < 200 ? { label: 'প্রি-ডায়াবেটিক', cls: 'bg-amber-100 text-amber-700' }
               :            { label: 'ডায়াবেটিক', cls: 'bg-red-100 text-red-700' },
    goodTrend: 'down', placeholder: '১৪০',
  },
  blood_pressure: {
    label: 'রক্তচাপ', unit: 'mmHg', svgColor: '#f43f5e',
    accentBg: 'bg-rose-50', accentText: 'text-rose-600', accentBorder: 'border-rose-200', dotBg: 'bg-rose-100',
    icon: Heart, toNumber: v => parseInt(v.split('/')[0]),
    status: n => n < 120 ? { label: 'স্বাভাবিক', cls: 'bg-green-100 text-green-700' }
               : n < 130 ? { label: 'উন্নত', cls: 'bg-amber-100 text-amber-700' }
               :            { label: 'উচ্চ রক্তচাপ', cls: 'bg-red-100 text-red-700' },
    goodTrend: 'down', placeholder: '১২০/৮০',
  },
  weight: {
    label: 'ওজন', unit: 'কেজি', svgColor: '#f59e0b',
    accentBg: 'bg-amber-50', accentText: 'text-amber-600', accentBorder: 'border-amber-200', dotBg: 'bg-amber-100',
    icon: Scale, toNumber: v => parseFloat(v),
    status: () => null, goodTrend: 'neutral', placeholder: '৭০',
  },
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const W = 120, H = 40, pad = 4
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (W - pad * 2),
    y: (H - pad) - ((v - min) / range) * (H - pad * 2),
  }))
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i].x - pts[i - 1].x) * 0.4
    d += ` C${pts[i-1].x+cp},${pts[i-1].y} ${pts[i].x-cp},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={color} />
    </svg>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ type, metrics, onAdd, onEdit, onDelete }: {
  type: MetricType; metrics: HealthMetric[]
  onAdd: (t: MetricType) => void; onEdit: (m: HealthMetric) => void; onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg  = metricConfig[type], Icon = cfg.icon
  // Memoize per-type sort to avoid re-running on every parent render.
  const sorted = useMemo(
    () => metrics
      .filter(m => m.metric_type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [metrics, type],
  )
  const latest = sorted[0], prev = sorted[1]
  const sparkValues = useMemo(
    () => sorted.slice().reverse().map(m => cfg.toNumber(m.value)),
    [sorted, cfg],
  )
  const latestNum = latest ? cfg.toNumber(latest.value) : null
  const prevNum   = prev   ? cfg.toNumber(prev.value)   : null
  const delta     = latestNum !== null && prevNum !== null ? latestNum - prevNum : null
  const absDelta  = delta !== null ? Math.abs(delta) : null
  const status    = latestNum !== null ? cfg.status(latestNum) : null

  let TrendIcon = Minus, trendCls = 'text-slate-400 bg-slate-100'
  if (delta !== null && absDelta! > 0.01) {
    TrendIcon = delta < 0 ? TrendingDown : TrendingUp
    const good = delta < 0 ? cfg.goodTrend === 'down' : cfg.goodTrend === 'up'
    const bad  = delta < 0 ? cfg.goodTrend === 'up'   : cfg.goodTrend === 'down'
    trendCls = good ? 'text-green-600 bg-green-100' : bad ? 'text-red-500 bg-red-100' : 'text-amber-500 bg-amber-100'
  }
  const deltaLabel = delta !== null && absDelta! > 0.01
    ? `${delta > 0 ? '+' : ''}${type === 'blood_pressure' ? Math.round(delta) : delta.toFixed(1)}`
    : null

  return (
    <div className={`rounded-2xl border ${cfg.accentBorder} bg-white shadow-sm overflow-hidden`}>
      <div className={`${cfg.accentBg} px-5 pt-4 pb-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${cfg.dotBg}`}><Icon className={`w-4 h-4 ${cfg.accentText}`} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cfg.label}</span>
              {status && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>}
            </div>
            <div className="flex items-end gap-3">
              <div>
                <span className={`text-3xl font-extrabold ${cfg.accentText} tracking-tight leading-none`}>{latest?.value ?? 0}</span>
                <span className="text-xs text-slate-400 ml-1.5">{cfg.unit}</span>
              </div>
              {deltaLabel && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full mb-0.5 ${trendCls}`}>
                  <TrendIcon className="w-3 h-3" />{deltaLabel}
                </span>
              )}
            </div>
            {latest && <p className="text-[11px] text-slate-400 mt-1">সর্বশেষ: {formatDate(latest.date)}</p>}
          </div>
          {sparkValues.length >= 2 && (
            <div className="w-24 flex-shrink-0 opacity-80"><Sparkline values={sparkValues} color={cfg.svgColor} /></div>
          )}
        </div>
      </div>
      <div className="px-5 py-2.5 flex items-center justify-between border-t border-slate-100">
        <button type="button" onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {sorted.length}টি রিডিং
        </button>
        <Button size="sm" onClick={() => onAdd(type)}><Plus className="w-3.5 h-3.5" />যোগ করুন</Button>
      </div>
      {expanded && (
        <div className="border-t border-slate-100">
          {sorted.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">কোনো রিডিং নেই</p>
          ) : sorted.map((m, idx) => (
            <div key={m.id} className={`flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors ${idx !== sorted.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <span className="text-xs text-slate-400 w-24">{formatDate(m.date)}</span>
              <span className={`text-sm font-bold ${idx === 0 ? cfg.accentText : 'text-slate-700'}`}>{m.value}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => onEdit(m)} className="p-1.5 text-slate-300 hover:text-green-600 hover:bg-green-50 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(m.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Metric Modal ──────────────────────────────────────────────────────────────
function MetricModal({ state, onClose, patientId }: { state: MetricModalState; onClose: () => void; patientId: string }) {
  const queryClient = useQueryClient()
  const cfg = metricConfig[state.type]
  const schema = state.type === 'rbs' ? rbsSchema : state.type === 'blood_pressure' ? bpSchema : weightSchema
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { value: state.editing?.value ?? '', date: state.editing?.date ?? new Date().toISOString().split('T')[0] },
  })
  const addMutation = useMutation({
    mutationFn: (d: { value: string; date: string }) =>
      api.patient.addMetric({ patient_id: patientId, metric_type: state.type, date: d.date, value: String(d.value) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['metrics', patientId] }); onClose(); reset() },
  })
  const updateMutation = useMutation({
    mutationFn: (d: { value: string; date: string }) =>
      api.patient.updateMetric(state.editing!.id, { value: String(d.value), date: d.date }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['metrics', patientId] }); onClose() },
  })
  const onSubmit = (d: { value: string | number; date: string }) => {
    const payload = { value: String(d.value), date: d.date }
    state.editing ? updateMutation.mutate(payload) : addMutation.mutate(payload)
  }
  return (
    <Modal isOpen={state.isOpen} onClose={onClose} title={state.editing ? 'রিডিং সম্পাদনা' : `${cfg.label} যোগ করুন`} size="sm">
      <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
        <Input label="তারিখ" type="date" error={(errors as Record<string, { message?: string }>).date?.message} {...register('date')} />
        <Input label={`${cfg.label} (${cfg.unit})`} placeholder={cfg.placeholder} error={(errors as Record<string, { message?: string }>).value?.message} {...register('value')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
          <Button type="submit" loading={addMutation.isPending || updateMutation.isPending}>সংরক্ষণ</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Tab: স্বাস্থ্য পরিমাপ ────────────────────────────────────────────────────
function MetricsTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient()
  const [metricModal, setMetricModal] = useState<MetricModalState>({ isOpen: false, type: 'rbs' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: metrics = [] } = useQuery({ queryKey: ['metrics', patientId], queryFn: () => api.patient.getMetrics(patientId), staleTime: 5 * 60_000 })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patient.deleteMetric(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['metrics', patientId] }); setDeleteId(null) },
  })
  return (
    <div className="space-y-4">
      {(['rbs', 'blood_pressure', 'weight'] as MetricType[]).map(type => (
        <MetricCard key={type} type={type} metrics={metrics}
          onAdd={t => setMetricModal({ isOpen: true, type: t })}
          onEdit={m => setMetricModal({ isOpen: true, type: m.metric_type, editing: m })}
          onDelete={id => setDeleteId(id)}
        />
      ))}
      <MetricModal state={metricModal} onClose={() => setMetricModal({ isOpen: false, type: 'rbs' })} patientId={patientId} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="রিডিং মুছুন" message="আপনি কি এই রিডিংটি মুছে ফেলতে চান?" isLoading={deleteMutation.isPending} />
    </div>
  )
}

// ── Tab: রিপোর্ট ──────────────────────────────────────────────────────────────
function ReportsTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient()
  const [uploadOpen,   setUploadOpen]   = useState(false)
  const [fifoWarning,  setFifoWarning]  = useState(false)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [dragActive,   setDragActive]   = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { data: reports = [] } = useQuery({ queryKey: ['reports', patientId], queryFn: () => api.patient.getReports(patientId), staleTime: 5 * 60_000 })
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.patient.uploadReport(patientId, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports', patientId] }); setUploadOpen(false); setSelectedFile(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patient.deleteReport(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports', patientId] }); setDeleteId(null) },
  })
  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert('ফাইলের আকার সর্বোচ্চ ১০ MB হতে পারে'); return }
    setSelectedFile(file)
  }
  const used = reports.length
  const pct  = Math.min((used / MAX_FREE) * 100, 100)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{used}/{MAX_FREE} রিপোর্ট ব্যবহৃত</p>
        <Button onClick={() => !IS_PREMIUM && used >= MAX_FREE ? setFifoWarning(true) : setUploadOpen(true)}>
          <Upload className="w-4 h-4" />রিপোর্ট আপলোড
        </Button>
      </div>
      {!IS_PREMIUM && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{used}/{MAX_FREE} ব্যবহৃত</span>
            <span className="text-xs text-slate-500">{MAX_FREE - used} বাকি</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${used >= MAX_FREE ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
          </div>
          {used >= MAX_FREE * 0.8 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>সীমার কাছাকাছি। পুরনো রিপোর্ট স্বয়ংক্রিয়ভাবে মুছবে।</span>
              </div>
              <Button size="sm" variant="secondary"><Star className="w-4 h-4" />প্রিমিয়াম</Button>
            </div>
          )}
        </div>
      )}
      {reports.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">কোনো রিপোর্ট নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).map(r => {
            const isImage = isImageFile(r.name)
            const isPdf   = isPdfFile(r.name)
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <button
                  type="button"
                  onClick={() => window.open(r.file_url, '_blank')}
                  className="group relative w-full h-40 bg-slate-100 flex items-center justify-center overflow-hidden"
                  aria-label={`${r.name} প্রিভিউ`}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.file_url} alt={r.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : isPdf ? (
                    <object
                      data={`${r.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      type="application/pdf"
                      className="w-full h-full pointer-events-none"
                    >
                      <div className="flex flex-col items-center justify-center h-full w-full bg-red-50">
                        <FileText className="w-10 h-10 text-red-500" />
                        <span className="mt-2 text-xs font-semibold text-red-600">PDF</span>
                      </div>
                    </object>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-10 h-10 text-slate-400" />
                      <span className="mt-2 text-xs font-medium text-slate-500 uppercase">{r.name.split('.').pop() ?? 'ফাইল'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Eye className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-medium text-slate-900 text-sm truncate" title={r.name}>{r.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(r.size)} · {formatDateTime(r.uploaded_at)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(r.file_url, '_blank')}><Download className="w-3.5 h-3.5" />ডাউনলোড</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.id)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Modal isOpen={uploadOpen} onClose={() => { setUploadOpen(false); setSelectedFile(null) }} title="রিপোর্ট আপলোড" size="sm">
        <div className="space-y-4">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-slate-400'}`}
            onDragOver={e => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}>
            {selectedFile ? (
              <div><FileText className="w-10 h-10 text-green-600 mx-auto mb-2" /><p className="font-medium text-slate-900">{selectedFile.name}</p><p className="text-sm text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p></div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">ফাইল এখানে টেনে আনুন অথবা</p>
                <label className="mt-2 inline-block cursor-pointer text-green-600 text-sm font-medium hover:underline">
                  ফাইল বেছে নিন
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                </label>
                <p className="text-xs text-slate-400 mt-2">PDF, JPG, PNG · সর্বোচ্চ ১০ MB</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFile(null) }}>বাতিল</Button>
            <Button onClick={() => selectedFile && uploadMutation.mutate(selectedFile)} disabled={!selectedFile} loading={uploadMutation.isPending}>আপলোড করুন</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={fifoWarning} onClose={() => setFifoWarning(false)} title="সতর্কতা" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">আপনার সংরক্ষণ সীমা পূর্ণ। নতুন রিপোর্ট আপলোড করলে <strong>সবচেয়ে পুরনো রিপোর্টটি স্বয়ংক্রিয়ভাবে মুছে যাবে</strong>।</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setFifoWarning(false)}>বাতিল</Button>
            <Button className="flex-1" onClick={() => { setFifoWarning(false); setUploadOpen(true) }}>তবুও আপলোড করুন</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} title="রিপোর্ট মুছুন" message="এই রিপোর্টটি মুছে ফেলতে চান?" isLoading={deleteMutation.isPending} />
    </div>
  )
}

// ── Tab: গোপনীয়তা ────────────────────────────────────────────────────────────
function PrivacyTab({ patientId }: { patientId: string }) {
  const actionIcons  = { searched: Search, viewed: Eye, downloaded: Download, shared: Share2 }
  const actionLabels = { searched: 'অনুসন্ধান করেছেন', viewed: 'দেখেছেন', downloaded: 'ডাউনলোড করেছেন', shared: 'শেয়ার করেছেন' }
  const { data: logs = [] } = useQuery({ queryKey: ['privacy-log', patientId], queryFn: () => api.patient.getPrivacyLog(patientId), staleTime: 60_000 })
  const sorted     = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const totalViews    = logs.filter(l => l.action === 'viewed').length
  const totalDl       = logs.filter(l => l.action === 'downloaded').length
  const totalSearches = logs.filter(l => l.action === 'searched').length
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Eye}      label="মোট দেখা হয়েছে" value={totalViews}    color="blue"  />
        <StatCard icon={Download} label="মোট ডাউনলোড"   value={totalDl}       color="green" />
        <StatCard icon={Search}   label="মোট অনুসন্ধান"   value={totalSearches} color="teal"  />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900 text-sm">প্রবেশ লগ</h3>
        </div>
        {sorted.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">কোনো প্রবেশ লগ নেই</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {sorted.map(log => {
              const Icon = actionIcons[log.action]
              return (
                <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{log.accessor_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {log.report_name || (log.action === 'searched' ? 'রোগী প্রোফাইল' : 'নেই')}
                    </p>
                  </div>
                  <StatusBadge status={log.accessor_role} />
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                    <Icon className="w-3.5 h-3.5" />{actionLabels[log.action]}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:block">{formatDateTime(log.timestamp)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabId = 'metrics' | 'reports' | 'privacy'

const patientTabs: { id: TabId; label: string }[] = [
  { id: 'metrics', label: 'স্বাস্থ্য পরিমাপ' },
  { id: 'reports', label: 'রিপোর্ট'          },
  { id: 'privacy', label: 'গোপনীয়তা লগ'     },
]

const portalLink: Partial<Record<Role, { href: string; label: string; cls: string }>> = {
  owner:       { href: '/owner',       label: 'Owner Portal',       cls: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'   },
  manager:     { href: '/manager',     label: 'Manager Portal',     cls: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100'   },
  pathologist: { href: '/pathologist', label: 'Pathologist Portal', cls: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
}

// ── Edit Profile Modal ───────────────────────────────────────────────────────
// NOTE: Profile editing has moved to the global SettingsModal (header dropdown),
// so the in-page EditProfileModal was removed. Add it back here only if you need
// portal-specific edit fields beyond what SettingsModal already exposes.

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const { user }  = useAuthStore()
  const role      = (user?.roles[0] ?? 'patient') as Role
  const portal    = portalLink[role]
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabId>('metrics')

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', PATIENT_ID],
    queryFn:  () => api.patient.getDashboard(PATIENT_ID),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const privacyMutation = useMutation({
    mutationFn: (next: boolean) => api.patient.setPrivacy(next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['patient', PATIENT_ID] })
      const prev = queryClient.getQueryData(['patient', PATIENT_ID])
      queryClient.setQueryData(['patient', PATIENT_ID], (old: typeof patient) =>
        old ? { ...old, is_private: next } : old)
      return { prev }
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['patient', PATIENT_ID], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['patient', PATIENT_ID] }),
  })

  if (isLoading) return (
    <div className="space-y-6 animate-pulse-soft">
      <div className="bg-white rounded-2xl border border-slate-100 h-56 skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 skeleton rounded-2xl" />
          <div className="h-40 skeleton rounded-2xl" />
        </div>
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    </div>
  )
  if (!patient) return (
    <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
      <User className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-slate-900 mb-1">রোগীর তথ্য পাওয়া যায়নি</h3>
      <p className="text-sm text-slate-500">
        {error instanceof Error ? error.message : 'আপনার অ্যাকাউন্টে রোগী প্রোফাইল নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।'}
      </p>
    </div>
  )

  const isPremium     = patient.subscription_tier === 'Premium'
  const isHivPositive = patient.hiv_status === 'Positive'
  const isPrivate     = !!patient.is_private
  const genderLabel   = patient.gender === 'Male' ? 'পুরুষ' : patient.gender === 'Female' ? 'মহিলা' : 'অন্যান্য'
  const conditions    = (patient.conditions ?? []) as PatientCondition[]

  return (
    <div className="space-y-6">

      {/* ── Profile Hero ─────────────────────────────────────────────────── */}
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
        isHivPositive ? 'border-red-300' : 'border-slate-200'
      }`}>
        <div className={`relative h-16 sm:h-20 bg-gradient-to-r ${
          isHivPositive
            ? 'from-red-600 via-red-500 to-rose-500'
            : 'from-green-600 via-green-500 to-emerald-500'
        }`}>
          <div className="absolute top-3 right-3 sm:top-4 sm:right-5 flex flex-wrap items-center justify-end gap-2">
            {portal && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-white/90 backdrop-blur text-slate-700 border-white/60 shadow-sm">
                {role === 'owner' ? <Building2 className="w-3 h-3" /> : role === 'manager' ? <UserCheck className="w-3 h-3" /> : <Microscope className="w-3 h-3" />}
                {role === 'owner' ? 'মালিক' : role === 'manager' ? 'ম্যানেজার' : 'প্যাথলজিস্ট'}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
              isPremium ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white/90 backdrop-blur text-slate-600 border-white/60'
            }`}>
              {isPremium && <Crown className="w-3 h-3" />}
              {isPremium ? 'প্রিমিয়াম' : 'ফ্রি'}
            </span>
            <button
              type="button"
              onClick={() => privacyMutation.mutate(!isPrivate)}
              disabled={privacyMutation.isPending}
              title={isPrivate
                ? 'ক্লিক করে প্রকাশ্য করুন — ডাক্তার আপনার প্রোফাইল খুঁজে পাবেন'
                : 'ক্লিক করে ব্যক্তিগত করুন — ডাক্তার আপনার প্রোফাইল খুঁজে পাবেন না'}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm transition-all disabled:opacity-60 ${
                isPrivate
                  ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-900'
                  : 'bg-white/90 backdrop-blur text-slate-700 border-white/60 hover:bg-white'
              }`}
            >
              {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isPrivate ? 'ব্যক্তিগত' : 'প্রকাশ্য'}
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            {/* Identity: avatar (pulled up over banner) + name + health_id (stay below banner) */}
            <div className="flex items-end gap-3 sm:gap-4 min-w-0">
              <div className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0 transition-colors -mt-8 sm:-mt-10 ${
                isHivPositive ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <User className={`w-8 h-8 sm:w-10 sm:h-10 ${
                  isHivPositive ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div className="min-w-0 pb-0.5 sm:pb-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight truncate">{patient.name}</h2>
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-0.5 tracking-widest">{patient.health_id}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3" />{patient.age} বছর
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {genderLabel}
                  </span>
                  {patient.nid && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                      NID: {patient.nid}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QR — pushed to the right on desktop, full width on mobile.
                mt-2 sm:mt-4 gives the small breathing room above the health card. */}
            <div className="sm:ml-auto w-full sm:w-72 sm:flex-shrink-0 mt-2 sm:mt-4">
              <QRHealthId healthId={patient.health_id} variant="compact" />
            </div>
          </div>

          {/* Self-reported long-term conditions */}
          {conditions.length > 0 && (
            <div className="mt-4 px-3 py-2.5 bg-amber-50/70 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">দীর্ঘমেয়াদী রোগ</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PATIENT_CONDITIONS.filter(c => conditions.includes(c.value)).map(c => (
                  <span key={c.value} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 ring-1 ring-amber-300">
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {patientTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div>
        {activeTab === 'metrics' && <MetricsTab patientId={PATIENT_ID} />}
        {activeTab === 'reports' && <ReportsTab patientId={PATIENT_ID} />}
        {activeTab === 'privacy' && <PrivacyTab patientId={PATIENT_ID} />}
      </div>

    </div>
  )
}
