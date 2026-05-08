"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { FlaskConical, Eye } from 'lucide-react'
import type { LabResult } from '@/types'

export default function CompletedReportsPage() {
  const { user } = useAuthStore()
  const pathologistId = user?.id ?? 'p1'
  const [viewResult, setViewResult] = useState<LabResult | null>(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['completed-reports', pathologistId],
    queryFn: () => api.pathologist.getCompletedReports(pathologistId),
  })

  const remarkVariantMap: Record<string, 'green' | 'red' | 'amber'> = {
    'Normal': 'green',
    'Abnormal': 'red',
    'Follow-up required': 'amber',
  }

  const remarkLabelMap: Record<string, string> = {
    'Normal': 'স্বাভাবিক',
    'Abnormal': 'অস্বাভাবিক',
    'Follow-up required': 'ফলো-আপ প্রয়োজন',
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">সম্পন্ন রিপোর্ট</h2>
        <p className="text-sm text-slate-500 mt-0.5">মোট {reports.length}টি সম্পন্ন পরীক্ষা</p>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['রোগী', 'পরীক্ষা', 'ডাক্তার', 'সম্পন্নের তারিখ', 'মন্তব্য', 'কার্যক্রম']} />
          <TableBody isEmpty={reports.length === 0} emptyMessage="কোনো সম্পন্ন রিপোর্ট নেই" colSpan={6}>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell><span className="font-medium">{r.patient_name}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-teal-500" />
                    {r.test_name}
                  </div>
                </TableCell>
                <TableCell>{r.ordered_by_doctor_name}</TableCell>
                <TableCell>{r.result ? formatDate(r.result.submitted_at) : '—'}</TableCell>
                <TableCell>
                  {r.result ? (
                    <Badge variant={remarkVariantMap[r.result.remarks]}>
                      {remarkLabelMap[r.result.remarks]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.result && (
                    <button
                      onClick={() => setViewResult(r.result!)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                      aria-label="ফলাফল দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            কোনো সম্পন্ন রিপোর্ট নেই
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{r.patient_name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <FlaskConical className="w-3.5 h-3.5 text-teal-500" />
                    <p className="text-sm text-slate-600">{r.test_name}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">ডাক্তার: {r.ordered_by_doctor_name}</p>
                  {r.result && (
                    <>
                      <p className="text-xs text-slate-400">{formatDate(r.result.submitted_at)}</p>
                      <div className="mt-2">
                        <Badge variant={remarkVariantMap[r.result.remarks]}>
                          {remarkLabelMap[r.result.remarks]}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                {r.result && (
                  <button
                    onClick={() => setViewResult(r.result!)}
                    className="p-1.5 text-slate-400 hover:text-teal-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={!!viewResult}
        onClose={() => setViewResult(null)}
        title="পরীক্ষার ফলাফল"
        size="md"
      >
        {viewResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">মন্তব্য</span>
              <Badge variant={remarkVariantMap[viewResult.remarks]}>
                {remarkLabelMap[viewResult.remarks]}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">ফলাফলের বিবরণ</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                {viewResult.findings}
              </p>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
              <span>জমা দিয়েছেন: {viewResult.submitted_by_name}</span>
              <span>{formatDate(viewResult.submitted_at)}</span>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewResult(null)}>বন্ধ করুন</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
