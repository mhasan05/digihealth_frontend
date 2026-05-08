"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import { FlaskConical, Send } from 'lucide-react'
import type { LabOrder } from '@/types'

const resultSchema = z.object({
  findings: z.string().min(5, 'ফলাফলের বিবরণ দিন'),
  remarks: z.enum(['Normal', 'Abnormal', 'Follow-up required']),
})

type ResultForm = z.infer<typeof resultSchema>

export default function UpcomingTestsPage() {
  const { user } = useAuthStore()
  const pathologistId = user?.id ?? 'p1'
  const pathologistName = user?.name ?? 'প্যাথলজিস্ট'
  const queryClient = useQueryClient()
  const [submitOrder, setSubmitOrder] = useState<LabOrder | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['upcoming-tests', pathologistId],
    queryFn: () => api.pathologist.getUpcomingTests(pathologistId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResultForm>({
    resolver: zodResolver(resultSchema),
    defaultValues: { remarks: 'Normal' },
  })

  const submitMutation = useMutation({
    mutationFn: (data: ResultForm) =>
      api.pathologist.submitResult(submitOrder!.id, data, pathologistName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-tests', pathologistId] })
      queryClient.invalidateQueries({ queryKey: ['completed-reports', pathologistId] })
      queryClient.invalidateQueries({ queryKey: ['pathologist-dashboard', pathologistId] })
      setSubmitOrder(null)
      reset()
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">অপেক্ষমান পরীক্ষা</h2>
        <p className="text-sm text-slate-500 mt-0.5">মোট {orders.length}টি পরীক্ষা বরাদ্দ আছে</p>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHead columns={['রোগী', 'পরীক্ষা', 'ডাক্তার', 'তারিখ', 'স্ট্যাটাস', 'কার্যক্রম']} />
          <TableBody isEmpty={orders.length === 0} emptyMessage="কোনো অপেক্ষমান পরীক্ষা নেই" colSpan={6}>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell><span className="font-medium">{o.patient_name}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-teal-500" />
                    {o.test_name}
                  </div>
                </TableCell>
                <TableCell>{o.ordered_by_doctor_name}</TableCell>
                <TableCell>{formatDate(o.created_at)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => { reset({ remarks: 'Normal' }); setSubmitOrder(o) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors font-medium"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ফলাফল জমা
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            কোনো অপেক্ষমান পরীক্ষা নেই
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{o.patient_name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <FlaskConical className="w-3.5 h-3.5 text-teal-500" />
                    <p className="text-sm text-slate-600">{o.test_name}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">ডাক্তার: {o.ordered_by_doctor_name}</p>
                  <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                  <div className="mt-2">
                    <StatusBadge status={o.status} />
                  </div>
                </div>
                <button
                  onClick={() => { reset({ remarks: 'Normal' }); setSubmitOrder(o) }}
                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={!!submitOrder}
        onClose={() => { setSubmitOrder(null); reset() }}
        title="ফলাফল জমা দিন"
        size="md"
      >
        {submitOrder && (
          <div className="space-y-4">
            <div className="bg-teal-50 rounded-lg p-3 text-sm text-teal-800 space-y-1">
              <p><span className="font-medium">রোগী:</span> {submitOrder.patient_name}</p>
              <p><span className="font-medium">পরীক্ষা:</span> {submitOrder.test_name}</p>
              <p><span className="font-medium">ডাক্তার:</span> {submitOrder.ordered_by_doctor_name}</p>
            </div>
            <form onSubmit={handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ফলাফলের বিবরণ <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('findings')}
                  rows={5}
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none ${
                    errors.findings ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="পরীক্ষার ফলাফল বিস্তারিত লিখুন..."
                />
                {errors.findings && (
                  <p className="mt-1 text-xs text-red-500">{errors.findings.message}</p>
                )}
              </div>
              <Select
                label="মন্তব্য"
                error={errors.remarks?.message}
                options={[
                  { value: 'Normal', label: 'স্বাভাবিক' },
                  { value: 'Abnormal', label: 'অস্বাভাবিক' },
                  { value: 'Follow-up required', label: 'ফলো-আপ প্রয়োজন' },
                ]}
                {...register('remarks')}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setSubmitOrder(null); reset() }}>বাতিল</Button>
                <Button type="submit" loading={submitMutation.isPending}>জমা দিন</Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
