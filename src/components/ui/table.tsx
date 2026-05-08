import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { FileSearch } from 'lucide-react'

interface TableProps {
  children: ReactNode
  className?: string
}

interface TableHeadProps {
  columns: string[]
}

interface TableBodyProps {
  children: ReactNode
  isEmpty?: boolean
  emptyMessage?: string
  colSpan?: number
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ columns }: TableHeadProps) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {columns.map((col, i) => (
          <th
            key={i}
            className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TableBody({ children, isEmpty, emptyMessage = 'কোনো তথ্য নেই', colSpan = 6 }: TableBodyProps) {
  if (isEmpty) {
    return (
      <tbody>
        <tr>
          <td colSpan={colSpan} className="px-4 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FileSearch className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('hover:bg-green-50/40 transition-colors duration-100', className)}>
      {children}
    </tr>
  )
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3.5 text-slate-800', className)}>{children}</td>
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-500 font-medium">
        পাতা <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 hover:border-slate-400 transition-all"
        >
          ← পূর্ববর্তী
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 hover:border-slate-400 transition-all"
        >
          পরবর্তী →
        </button>
      </div>
    </div>
  )
}
