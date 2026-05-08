"use client"

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { MonthlyFinancial } from '@/types'

function fTaka(v: number) {
  if (v >= 1_000_000) return `৳${(v / 1_000_000).toFixed(2)} মি`
  if (v >= 100_000)   return `৳${(v / 100_000).toFixed(1)} লাখ`
  return `৳${(v / 1_000).toFixed(0)}k`
}
function fShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 100_000)   return `${(v / 100_000).toFixed(0)}L`
  return `${(v / 1_000).toFixed(0)}K`
}

const W = 900, H = 210
const PT = 20, PB = 36
const CW = W
const CH = H - PT - PB

type Metric = 'revenue' | 'profit' | 'both'
interface Props { data: MonthlyFinancial[] }

const METRIC_BTNS: { key: Metric; label: string }[] = [
  { key: 'revenue', label: 'আয়'    },
  { key: 'profit',  label: 'মুনাফা' },
  { key: 'both',    label: 'উভয়'   },
]

function buildLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i].x - pts[i - 1].x) * 0.42
    d += ` C${pts[i-1].x + cp},${pts[i-1].y} ${pts[i].x - cp},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }
  return d
}
function buildArea(pts: { x: number; y: number }[], bottom: number): string {
  const l = buildLine(pts)
  if (!l) return ''
  return `${l} L${pts[pts.length-1].x},${bottom} L${pts[0].x},${bottom} Z`
}

export function RevenueChart({ data }: Props) {
  const [metric, setMetric]   = useState<Metric>('both')
  const [hovered, setHovered] = useState<number | null>(null)

  const n     = data.length
  const slotW = CW / n
  const bottom = PT + CH

  const xPos = useMemo(() => (i: number) => (i + 0.5) * slotW, [slotW])

  const { maxVal, revPts, profPts, yTicks } = useMemo(() => {
    const maxVal = Math.max(...data.flatMap(d => [
      metric !== 'profit'  ? d.revenue : 0,
      metric !== 'revenue' ? d.profit  : 0,
    ])) * 1.15
    const yPos = (v: number) => PT + (1 - Math.max(0, v) / maxVal) * CH
    const revPts  = data.map((d, i) => ({ x: xPos(i), y: yPos(d.revenue) }))
    const profPts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.profit)  }))
    const yTicks  = [1/4, 1/2, 3/4, 1].map(f => ({
      y: PT + (1 - f) * CH,
      label: fShort(maxVal * f),
    }))
    return { maxVal, revPts, profPts, yTicks }
  }, [data, metric, xPos])

  const { totalRev, totalProf, avgMargin, revTrend, profTrend } = useMemo(() => {
    const totalRev  = data.reduce((s, d) => s + d.revenue, 0)
    const totalProf = data.reduce((s, d) => s + d.profit,  0)
    const avgMargin = totalRev > 0 ? Math.round((totalProf / totalRev) * 100) : 0
    const last  = data[data.length - 1]
    const prev1 = data[data.length - 2]
    const revTrend  = prev1 ? Math.round(((last.revenue - prev1.revenue) / prev1.revenue) * 100) : 0
    const profTrend = prev1 ? Math.round(((last.profit  - prev1.profit)  / prev1.profit)  * 100) : 0
    return { totalRev, totalProf, avgMargin, revTrend, profTrend }
  }, [data])

  const tipPct   = hovered !== null ? (xPos(hovered) / W) * 100 : 50
  const tipAlign = tipPct > 72 ? 'right' : tipPct < 28 ? 'left' : 'center'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
        {/* KPIs */}
        <div className="flex items-start gap-8">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">মোট আয়</p>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{fTaka(totalRev)}</p>
            <div className={`inline-flex items-center gap-1 mt-1 text-[11px] font-semibold ${revTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {revTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(revTrend)}% গত মাস থেকে
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">নিট মুনাফা</p>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{fTaka(totalProf)}</p>
            <div className={`inline-flex items-center gap-1 mt-1 text-[11px] font-semibold ${profTrend >= 0 ? 'text-sky-600' : 'text-red-500'}`}>
              {profTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(profTrend)}% গত মাস থেকে
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">গড় মার্জিন</p>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{avgMargin}%</p>
            <p className="text-[11px] text-slate-400 mt-1">গত ১২ মাস</p>
          </div>
        </div>

        {/* Metric toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {METRIC_BTNS.map(b => (
            <button key={b.key} onClick={() => setMetric(b.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                metric === b.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart — edge-to-edge, no horizontal padding ──────────── */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block"
          style={{ maxHeight: 230 }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="rc-rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="rc-prof-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.00" />
            </linearGradient>
            <clipPath id="rc-clip">
              <rect x="0" y="0" width={W} height={H} />
            </clipPath>
          </defs>

          {/* Dotted horizontal grid lines — full width */}
          {yTicks.map(({ y, label }, i) => (
            <g key={i}>
              <line x1="0" y1={y} x2={W} y2={y}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 6" />
              {/* Y labels overlaid inside, left edge */}
              <text x="8" y={y - 4}
                textAnchor="start" fontSize="9.5" fill="#cbd5e1" fontFamily="inherit">
                {label}
              </text>
            </g>
          ))}

          {/* Column hover highlight */}
          {hovered !== null && (
            <rect x={hovered * slotW} y={PT} width={slotW} height={CH}
              fill="#f1f5f9" />
          )}

          {/* Revenue area + line */}
          {(metric === 'revenue' || metric === 'both') && (
            <g clipPath="url(#rc-clip)">
              <path d={buildArea(revPts, bottom)} fill="url(#rc-rev-fill)" />
              <path d={buildLine(revPts)} fill="none"
                stroke="#16a34a" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}

          {/* Profit area + line */}
          {(metric === 'profit' || metric === 'both') && (
            <g clipPath="url(#rc-clip)">
              <path d={buildArea(profPts, bottom)} fill="url(#rc-prof-fill)" />
              <path d={buildLine(profPts)} fill="none"
                stroke="#0ea5e9" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}

          {/* Hover crosshair */}
          {hovered !== null && (
            <line x1={xPos(hovered)} y1={PT}
              x2={xPos(hovered)} y2={bottom}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {/* Hover dots */}
          {hovered !== null && (
            <>
              {(metric === 'revenue' || metric === 'both') && (
                <>
                  <circle cx={revPts[hovered].x} cy={revPts[hovered].y}
                    r="8" fill="#16a34a" fillOpacity="0.12" />
                  <circle cx={revPts[hovered].x} cy={revPts[hovered].y}
                    r="4.5" fill="#16a34a" stroke="white" strokeWidth="2" />
                </>
              )}
              {(metric === 'profit' || metric === 'both') && (
                <>
                  <circle cx={profPts[hovered].x} cy={profPts[hovered].y}
                    r="8" fill="#0ea5e9" fillOpacity="0.12" />
                  <circle cx={profPts[hovered].x} cy={profPts[hovered].y}
                    r="4.5" fill="#0ea5e9" stroke="white" strokeWidth="2" />
                </>
              )}
            </>
          )}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text key={i} x={xPos(i)} y={H - 8}
              textAnchor="middle" fontSize="11"
              fill={hovered === i ? '#475569' : '#94a3b8'}
              fontWeight={hovered === i ? '700' : '400'}
              fontFamily="inherit">
              {d.month}
            </text>
          ))}

          {/* Invisible hover bands */}
          {data.map((_, i) => (
            <rect key={i}
              x={i * slotW} y={0} width={slotW} height={H}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)} />
          ))}
        </svg>

        {/* Tooltip */}
        {hovered !== null && (() => {
          const hd = data[hovered]
          const mg = hd.revenue > 0 ? Math.round((hd.profit / hd.revenue) * 100) : 0
          return (
            <div className="absolute top-2 pointer-events-none z-10"
              style={{
                left: `${tipPct}%`,
                transform: tipAlign === 'right'
                  ? 'translateX(-90%)'
                  : tipAlign === 'left'
                  ? 'translateX(-10%)'
                  : 'translateX(-50%)',
              }}>
              <div className="bg-slate-900 rounded-xl px-4 py-3.5 min-w-[164px] shadow-2xl">
                <p className="text-[11px] font-semibold text-slate-400 mb-2.5">{hd.month}</p>
                <div className="space-y-1.5">
                  {(metric === 'revenue' || metric === 'both') && (
                    <div className="flex items-center justify-between gap-5">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />আয়
                      </span>
                      <span className="text-xs font-bold text-white">{fTaka(hd.revenue)}</span>
                    </div>
                  )}
                  {(metric === 'profit' || metric === 'both') && (
                    <div className="flex items-center justify-between gap-5">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />মুনাফা
                      </span>
                      <span className="text-xs font-bold text-white">{fTaka(hd.profit)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-sm bg-slate-600 inline-block" />ব্যয়
                    </span>
                    <span className="text-xs font-bold text-slate-300">{fTaka(hd.expenses)}</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-700 flex justify-between">
                  <span className="text-[11px] text-slate-400">মার্জিন</span>
                  <span className="text-xs font-extrabold text-green-400">{mg}%</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-6 py-3.5 border-t border-slate-100">
        {(metric === 'revenue' || metric === 'both') && (
          <div className="flex items-center gap-2">
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" /></svg>
            <span className="text-xs text-slate-500 font-medium">মোট আয়</span>
          </div>
        )}
        {(metric === 'profit' || metric === 'both') && (
          <div className="flex items-center gap-2">
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" /></svg>
            <span className="text-xs text-slate-500 font-medium">নিট মুনাফা</span>
          </div>
        )}
      </div>

    </div>
  )
}
