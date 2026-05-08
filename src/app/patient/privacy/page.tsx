"use client"

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard } from '@/components/shared/stat-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'
import { Eye, Download, Share2, Users, Activity, ShieldCheck } from 'lucide-react'

const PATIENT_ID = 'pt1'

const actionIcons = {
  viewed: Eye,
  downloaded: Download,
  shared: Share2,
}

const actionLabels = {
  viewed: 'দেখেছেন',
  downloaded: 'ডাউনলোড করেছেন',
  shared: 'শেয়ার করেছেন',
}

export default function PrivacyPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['privacy-log', PATIENT_ID],
    queryFn: () => api.patient.getPrivacyLog(PATIENT_ID),
  })

  if (isLoading) return <LoadingSpinner />

  const totalViews = logs.filter((l) => l.action === 'viewed').length
  const totalDownloads = logs.filter((l) => l.action === 'downloaded').length
  const uniquePeople = new Set(logs.map((l) => l.accessor_name)).size
  const totalAccesses = logs.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">গোপনীয়তা লগ</h2>
        <p className="text-sm text-slate-500 mt-1">আপনার রিপোর্টে কে কখন প্রবেশ করেছেন তার বিবরণ</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="মোট দেখা হয়েছে" value={totalViews} color="blue" />
        <StatCard icon={Download} label="মোট ডাউনলোড" value={totalDownloads} color="green" />
        <StatCard icon={Users} label="অনন্য ব্যক্তি" value={uniquePeople} color="teal" />
        <StatCard icon={Activity} label="মোট প্রবেশ" value={totalAccesses} color="amber" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">প্রবেশ লগ</h3>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHead columns={['প্রবেশকারী', 'ভূমিকা', 'কার্যক্রম', 'রিপোর্টের নাম', 'সময়']} />
            <TableBody isEmpty={logs.length === 0} emptyMessage="কোনো প্রবেশ লগ নেই" colSpan={5}>
              {logs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((log) => {
                  const Icon = actionIcons[log.action]
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="font-medium">{log.accessor_name}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.accessor_role} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-4 h-4 ${log.action === 'downloaded' ? 'text-green-600' : log.action === 'shared' ? 'text-purple-600' : 'text-green-600'}`} />
                          <span>{actionLabels[log.action]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600 text-xs">{log.report_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-500 text-xs">{formatDateTime(log.timestamp)}</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {logs.length === 0 ? (
            <p className="text-center text-slate-500 py-12 text-sm">কোনো প্রবেশ লগ নেই</p>
          ) : (
            logs
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((log) => {
                const Icon = actionIcons[log.action]
                return (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{log.accessor_name}</p>
                        <StatusBadge status={log.accessor_role} />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Icon className="w-4 h-4" />
                        {actionLabels[log.action]}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 truncate">{log.report_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(log.timestamp)}</p>
                  </div>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}
