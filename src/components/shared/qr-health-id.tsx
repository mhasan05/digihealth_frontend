"use client"

import { QRCodeSVG } from 'qrcode.react'
import { Fingerprint } from 'lucide-react'

interface QRHealthIdProps {
  healthId: string
}

export function QRHealthId({ healthId }: QRHealthIdProps) {
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
