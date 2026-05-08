"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { Upload, Download, Trash2, FileText, AlertTriangle, Star } from 'lucide-react'

const MAX_FREE_REPORTS = 10
const PATIENT_ID = 'pt1'
const IS_PREMIUM = false

export default function PatientReportsPage() {
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
    mutationFn: (file: File) =>
      api.patient.uploadReport(PATIENT_ID, {
        name: file.name,
        file_url: URL.createObjectURL(file),
        size: file.size,
      }),
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
      alert('ফাইলের আকার সর্বোচ্চ ১০ MB হতে পারে')
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
          <h2 className="text-xl font-bold text-slate-900">আমার রিপোর্ট</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {usedCount}/{MAX_FREE_REPORTS} রিপোর্ট ব্যবহৃত
          </p>
        </div>
        <Button onClick={handleUploadClick}>
          <Upload className="w-4 h-4" />
          রিপোর্ট আপলোড
        </Button>
      </div>

      {!IS_PREMIUM && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{usedCount}/{MAX_FREE_REPORTS} রিপোর্ট ব্যবহৃত</span>
            <span className="text-xs text-slate-500">{MAX_FREE_REPORTS - usedCount} বাকি</span>
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
                <span>সীমার কাছাকাছি। পুরনো রিপোর্ট স্বয়ংক্রিয়ভাবে মুছবে।</span>
              </div>
              <Button size="sm" variant="secondary">
                <Star className="w-4 h-4" />
                প্রিমিয়াম
              </Button>
            </div>
          )}
        </Card>
      )}

      {reports.length === 0 ? (
        <Card className="py-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-500">কোনো রিপোর্ট নেই</p>
          <p className="text-sm text-slate-400 mt-1">আপনার মেডিকেল রিপোর্ট আপলোড করুন</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports
            .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
            .map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{report.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatFileSize(report.size)}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(report.uploaded_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(report.file_url, '_blank')}
                  >
                    <Download className="w-3.5 h-3.5" />
                    ডাউনলোড
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
              </Card>
            ))}
        </div>
      )}

      <Modal isOpen={uploadOpen} onClose={() => { setUploadOpen(false); setSelectedFile(null) }} title="রিপোর্ট আপলোড" size="sm">
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
                <p className="text-slate-600 text-sm">ফাইল এখানে টেনে আনুন অথবা</p>
                <label className="mt-2 inline-block cursor-pointer text-green-600 text-sm font-medium hover:underline">
                  ফাইল বেছে নিন
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">PDF, JPG, PNG — সর্বোচ্চ ১০ MB</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFile(null) }}>বাতিল</Button>
            <Button
              onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
              disabled={!selectedFile}
              loading={uploadMutation.isPending}
            >
              আপলোড করুন
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={fifoWarning} onClose={() => setFifoWarning(false)} title="সতর্কতা" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">
              আপনার সংরক্ষণ সীমা পূর্ণ হয়ে গেছে। নতুন রিপোর্ট আপলোড করলে <strong>সবচেয়ে পুরনো রিপোর্টটি স্বয়ংক্রিয়ভাবে মুছে যাবে</strong>।
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">প্রিমিয়াম আপগ্রেড করলে সীমাহীন রিপোর্ট সংরক্ষণ করতে পারবেন।</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setFifoWarning(false)}>বাতিল</Button>
            <Button
              className="flex-1"
              onClick={() => {
                setFifoWarning(false)
                setUploadOpen(true)
              }}
            >
              তবুও আপলোড করুন
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="রিপোর্ট মুছুন"
        message="আপনি কি এই রিপোর্টটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
