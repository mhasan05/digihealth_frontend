"use client"

import { QRCodeSVG } from 'qrcode.react'
import { Fingerprint } from 'lucide-react'

interface QRHealthIdProps {
  healthId: string
  /** 'card' = full vertical card (default). 'compact' = horizontal row, smaller. */
  variant?: 'card' | 'compact'
}

export function QRHealthId({ healthId, variant = 'card' }: QRHealthIdProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white w-full">
        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 flex-shrink-0">
          <QRCodeSVG
            value={healthId}
            size={82}
            bgColor="#ffffff"
            fgColor="#166534"
            level="M"
            includeMargin={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Fingerprint className="w-3 h-3 text-green-600 flex-shrink-0" />
            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">স্বাস্থ্য আইডি</p>
          </div>
          <p className="font-mono font-bold text-slate-800 text-xs tracking-widest break-all">{healthId}</p>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">DigiHealth হাসপাতালে স্ক্যান করুন</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white w-full">
      <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
        <QRCodeSVG
          value={healthId}
          size={130}
          bgColor="#ffffff"
          fgColor="#166534"
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <Fingerprint className="w-3.5 h-3.5 text-green-600" />
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">স্বাস্থ্য আইডি</p>
        </div>
        <p className="font-mono font-bold text-slate-800 text-sm tracking-widest">{healthId}</p>
        <p className="text-[10px] text-slate-400 mt-1">যেকোনো DigiHealth হাসপাতালে স্ক্যান করুন</p>
      </div>
    </div>
  )
}
