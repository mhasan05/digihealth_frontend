"use client"

import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/modal'
import { formatDateTime } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Smartphone } from 'lucide-react'
import type { FieldPrescription, FieldPrescriptionImage } from '@/types'

const isPdf = (img: FieldPrescriptionImage) => img.content_type === 'application/pdf'

/**
 * One field-collected prescription: who collected it, what was recorded, and
 * its page images. Clicking a page opens a viewer. `children` renders actions.
 */
export function FieldPrescriptionCard({
  rx,
  badge,
  showPhone = false,
  children,
}: {
  rx: FieldPrescription
  badge?: ReactNode
  showPhone?: boolean
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState<number | null>(null)

  const details = [
    rx.patient_name,
    rx.age != null ? t('fieldRx.ageYears', { age: rx.age }) : '',
    rx.gender ? t(`patient.${rx.gender.toLowerCase()}`) : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{formatDateTime(rx.collected_at)}</p>
          {showPhone && <p className="text-sm font-mono text-slate-700 mt-0.5">{rx.phone}</p>}
          {details && <p className="text-xs text-slate-500 mt-0.5">{details}</p>}
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            {t('fieldRx.collectedBy', { name: rx.collected_by_name || t('fieldRx.unknownStaff') })}
          </p>
        </div>
        {badge}
      </div>

      {rx.notes && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{rx.notes}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {rx.images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setPage(i)}
            className="relative w-20 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:ring-2 hover:ring-green-500/40 transition-all"
            aria-label={t('fieldRx.openPage', { page: img.page_no })}
          >
            {isPdf(img) ? (
              <div className="flex flex-col items-center justify-center h-full bg-red-50">
                <FileText className="w-6 h-6 text-red-500" />
                <span className="text-[10px] font-semibold text-red-600 mt-1">PDF</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.file_url} alt="" className="w-full h-full object-cover" />
            )}
            <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/60 text-white rounded px-1">
              {img.page_no}
            </span>
          </button>
        ))}
      </div>

      {children}

      {page !== null && rx.images[page] && (
        <Modal
          isOpen
          onClose={() => setPage(null)}
          title={t('fieldRx.viewerTitle')}
          subtitle={t('fieldRx.pageOf', { page: page + 1, total: rx.images.length })}
          size="xl"
        >
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[70vh]">
              {isPdf(rx.images[page]) ? (
                <object data={rx.images[page].file_url} type="application/pdf" className="w-full h-[70vh]">
                  <p className="text-white text-sm p-6">{t('fieldRx.pdfFallback')}</p>
                </object>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rx.images[page].file_url} alt="" className="max-h-[70vh] w-auto object-contain" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPage(p => (p! > 0 ? p! - 1 : p))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.previous')}
              </button>
              <a
                href={rx.images[page].file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {t('fieldRx.openOriginal')}
              </a>
              <button
                type="button"
                onClick={() => setPage(p => (p! < rx.images.length - 1 ? p! + 1 : p))}
                disabled={page === rx.images.length - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                {t('common.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
