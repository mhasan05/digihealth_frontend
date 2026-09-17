"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { Fingerprint, Maximize2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface QRHealthIdProps {
  healthId: string
  /** 'card' = full vertical card (default). 'compact' = horizontal row, smaller. */
  variant?: 'card' | 'compact'
}

export function QRHealthId({ healthId, variant = 'card' }: QRHealthIdProps) {
  const { t } = useTranslation()
  const [enlarged, setEnlarged] = useState(false)

  const enlargeModal = (
    <Modal isOpen={enlarged} onClose={() => setEnlarged(false)} title={t('qr.title')} size="sm">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
          <QRCodeSVG
            value={healthId}
            size={260}
            bgColor="#ffffff"
            fgColor="#166534"
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="font-mono font-bold text-slate-800 text-base tracking-widest">{healthId}</p>
        <p className="text-xs text-slate-400 text-center">{t('qr.scanHint')}</p>
      </div>
    </Modal>
  )

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white w-full text-left hover:border-green-300 transition-colors"
          aria-label={t('qr.enlargeAria')}
        >
          <div className="group relative p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 flex-shrink-0">
            <QRCodeSVG
              value={healthId}
              size={82}
              bgColor="#ffffff"
              fgColor="#166534"
              level="M"
              includeMargin={false}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-90 drop-shadow transition-opacity" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Fingerprint className="w-3 h-3 text-green-600 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">{t('qr.healthIdLabel')}</p>
            </div>
            <p className="font-mono font-bold text-slate-800 text-xs tracking-widest break-all">{healthId}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">{t('qr.scanHintShort')}</p>
          </div>
        </button>
        {enlargeModal}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEnlarged(true)}
        className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white w-full hover:border-green-300 transition-colors"
        aria-label={t('qr.enlargeAria')}
      >
        <div className="group relative p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <QRCodeSVG
            value={healthId}
            size={130}
            bgColor="#ffffff"
            fgColor="#166534"
            level="M"
            includeMargin={false}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center">
            <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-90 drop-shadow transition-opacity" />
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-green-600" />
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">{t('qr.healthIdLabel')}</p>
          </div>
          <p className="font-mono font-bold text-slate-800 text-sm tracking-widest">{healthId}</p>
          <p className="text-[10px] text-slate-400 mt-1">{t('qr.scanHint')}</p>
        </div>
      </button>
      {enlargeModal}
    </>
  )
}
