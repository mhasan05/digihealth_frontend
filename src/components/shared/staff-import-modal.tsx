"use client"

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, AlertTriangle, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

interface Applicant { id: string; name: string; phone: string }

interface StaffImportModalProps<T extends Applicant> {
  isOpen: boolean
  onClose: () => void
  roleLabel: string
  queryKeyPrefix: string
  search: (q: string) => Promise<T[]>
  doImport: (id: string, ward?: string) => Promise<T>
  onImported: () => void
}

/**
 * Search-then-attach modal for pulling an admin-approved, not-yet-attached
 * role-application applicant (Nurse/MedicalAssistant/Midwife, hospital=null)
 * into the current owner's hospital. Mirrors the Doctor registry
 * search-and-attach UX in owner/doctors/page.tsx, generalized so it isn't
 * copy-pasted per staff type.
 */
export function StaffImportModal<T extends Applicant>({
  isOpen, onClose, roleLabel, queryKeyPrefix, search, doImport, onImported,
}: StaffImportModalProps<T>) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<T | null>(null)
  const [ward, setWard] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) { setQuery(''); setPicked(null); setWard('') }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && !picked) inputRef.current?.focus()
  }, [isOpen, picked])

  const { data: results = [], isFetching } = useQuery({
    queryKey: [`${queryKeyPrefix}-applicants-search`, query],
    queryFn: () => search(query),
    enabled: isOpen && query.trim().length >= 1,
    staleTime: 30_000,
  })

  const importMutation = useMutation({
    mutationFn: () => doImport(picked!.id, ward.trim() || undefined),
    onSuccess: () => { onImported(); onClose() },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={picked ? 'হাসপাতালে যুক্ত করুন' : `আবেদনকারী ${roleLabel} খুঁজুন`}
      size="sm"
    >
      {!picked ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
            />
          </div>

          <div className="min-h-[160px] max-h-72 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/40">
            {query.trim().length < 1 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6 text-sm text-slate-400">
                <Search className="w-8 h-8 mb-2 text-slate-300" />
                খুঁজতে শুরু করুন
              </div>
            ) : isFetching ? (
              <div className="flex items-center justify-center h-40 text-sm text-slate-400">খুঁজছি...</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6 text-sm text-slate-500">
                <AlertTriangle className="w-6 h-6 mb-2 text-amber-400" />
                অনুমোদিত ও অযুক্ত কাউকে পাওয়া যায়নি।
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(item)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate">{item.phone}</p>
                      </div>
                      <span className="text-xs text-green-700 font-semibold whitespace-nowrap">যুক্ত করুন →</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{picked.name}</p>
              <p className="text-xs text-slate-500">{picked.phone}</p>
            </div>
          </div>
          <Input label="ওয়ার্ড (ঐচ্ছিক)" value={ward} onChange={e => setWard(e.target.value)} />
          <div className="flex justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>← অন্য কেউ বাছুন</Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
              <Button type="button" onClick={() => importMutation.mutate()} loading={importMutation.isPending}>যুক্ত করুন</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
