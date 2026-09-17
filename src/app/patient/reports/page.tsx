"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { Upload, Download, Trash2, FileText, AlertTriangle, Star, Eye } from 'lucide-react'

const isImageFile = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
const isPdfFile = (name: string) => /\.pdf$/i.test(name)

const MAX_FREE_REPORTS = 10
const PATIENT_ID = 'pt1'
const IS_PREMIUM = false

export default function PatientReportsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [fifoWarning, setFifoWarning] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', PATIENT_ID],
    queryFn: () => api.patient.getReports(PATIENT_ID),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.patient.uploadReport(PATIENT_ID, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', PATIENT_ID] })
      setUploadOpen(false)
      setFifoWarning(false)
      setSelectedFile(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.patient.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', PATIENT_ID] })
      setDeleteId(null)
    },
  })

  const handleUploadClick = () => {
    if (!IS_PREMIUM && reports.length >= MAX_FREE_REPORTS) {
      setFifoWarning(true)
    } else {
      setUploadOpen(true)
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(t('reports.fileSizeError'))
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const usedCount = reports.length
  const progressPercent = Math.min((usedCount / MAX_FREE_REPORTS) * 100, 100)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('nav.myReports')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('reports.usedCount', { used: usedCount, max: MAX_FREE_REPORTS })}
          </p>
        </div>
        <Button onClick={handleUploadClick}>
          <Upload className="w-4 h-4" />
          {t('patient.uploadReport')}
        </Button>
      </div>

      {!IS_PREMIUM && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{t('reports.usedCount', { used: usedCount, max: MAX_FREE_REPORTS })}</span>
            <span className="text-xs text-slate-500">{t('reports.remaining', { count: MAX_FREE_REPORTS - usedCount })}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usedCount >= MAX_FREE_REPORTS ? 'bg-red-500' : 'bg-green-600'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {usedCount >= MAX_FREE_REPORTS * 0.8 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('reports.nearLimit')}</span>
              </div>
              <Button size="sm" variant="secondary">
                <Star className="w-4 h-4" />
                {t('status.premium')}
              </Button>
            </div>
          )}
        </Card>
      )}

      {reports.length === 0 ? (
        <Card className="py-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('reports.noReports')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('reports.noReportsHint')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports
            .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
            .map((report) => {
              const isImage = isImageFile(report.name)
              const isPdf = isPdfFile(report.name)
              return (
                <Card key={report.id} padding="none" className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <button
                    type="button"
                    onClick={() => window.open(report.file_url, '_blank')}
                    className="group relative w-full h-40 bg-slate-100 flex items-center justify-center overflow-hidden"
                    aria-label={t('reports.previewAria', { name: report.name })}
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.file_url}
                        alt={report.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : isPdf ? (
                      <object
                        data={`${report.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
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
                        <span className="mt-2 text-xs font-medium text-slate-500 uppercase">
                          {report.name.split('.').pop() ?? t('reports.fileFallback')}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  <div className="p-3 flex-1 flex flex-col">
                    <p className="font-medium text-slate-900 text-sm truncate" title={report.name}>{report.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(report.size)} · {formatDateTime(report.uploaded_at)}</p>

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(report.file_url, '_blank')}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('common.download')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(report.id)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
        </div>
      )}

      <Modal isOpen={uploadOpen} onClose={() => { setUploadOpen(false); setSelectedFile(null) }} title={t('patient.uploadReport')} size="sm">
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div>
                <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">{t('reports.dragDrop')}</p>
                <label className="mt-2 inline-block cursor-pointer text-green-600 text-sm font-medium hover:underline">
                  {t('reports.chooseFile')}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">{t('reports.fileTypes')}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFile(null) }}>{t('common.cancel')}</Button>
            <Button
              onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
              disabled={!selectedFile}
              loading={uploadMutation.isPending}
            >
              {t('reports.uploadAction')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={fifoWarning} onClose={() => setFifoWarning(false)} title={t('common.warning')} size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">{t('reports.fifoWarning')}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">{t('reports.premiumHint')}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setFifoWarning(false)}>{t('common.cancel')}</Button>
            <Button
              className="flex-1"
              onClick={() => {
                setFifoWarning(false)
                setUploadOpen(true)
              }}
            >
              {t('reports.uploadAnyway')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('reports.deleteTitle')}
        message={t('reports.deleteConfirmPermanent')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
