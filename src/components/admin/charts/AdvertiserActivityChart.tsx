'use client'

import { useState } from 'react'
import type { MonthlyAdvertiserActivity } from '@/lib/admin/dashboard-stats'
import { EmptyState } from '@/components/admin/ui/EmptyState'

interface AdvertiserActivityChartProps {
  data: MonthlyAdvertiserActivity[]
}

const VIEW_W = 640
const VIEW_H = 280
const PAD_LEFT = 30
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 30
const BAR_MAX_WIDTH = 24
const SEGMENT_GAP = 2

function niceMax(value: number): number {
  if (value <= 0) return 4
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export function AdvertiserActivityChart({ data }: AdvertiserActivityChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
        <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Active Advertisers</h3>
        <div className="mt-4">
          <EmptyState title="No advertiser activity yet" message="Monthly advertiser activity will appear once campaigns are created." />
        </div>
      </div>
    )
  }

  const chartWidth = VIEW_W - PAD_LEFT - PAD_RIGHT
  const chartHeight = VIEW_H - PAD_TOP - PAD_BOTTOM
  const slotWidth = chartWidth / data.length
  const barWidth = Math.min(BAR_MAX_WIDTH, slotWidth * 0.5)
  const max = niceMax(Math.max(...data.map(d => d.newAdvertisers + d.returningAdvertisers)))
  const baseY = PAD_TOP + chartHeight
  const labelStride = Math.max(1, Math.ceil(data.length / 8))

  const bars = data.map((d, i) => {
    const cx = PAD_LEFT + slotWidth * i + slotWidth / 2
    const returningH = chartHeight * (d.returningAdvertisers / max)
    const newH = chartHeight * (d.newAdvertisers / max)
    const hasBoth = d.returningAdvertisers > 0 && d.newAdvertisers > 0
    const returningY = baseY - returningH
    const newY = returningY - newH - (hasBoth ? SEGMENT_GAP : 0)
    const topY = d.newAdvertisers > 0 ? newY : returningY
    return { ...d, cx, returningY, returningH, newY, newH, topY }
  })

  const gridValues = [0, max / 2, max]
  const active = hovered !== null ? bars[hovered] : null

  return (
    <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Active Advertisers</h3>
        <div className="flex items-center gap-3 text-xs text-[var(--cr-text-2)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--cr-chart-new)' }} />
            New
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--cr-chart-returning)' }} />
            Returning
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-56 w-full" role="img" aria-label="Monthly active advertisers, new versus returning">
          {gridValues.map(v => {
            const y = PAD_TOP + chartHeight * (1 - v / max)
            return (
              <g key={v}>
                <line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={y} y2={y} stroke="var(--cr-border-soft)" strokeWidth={1} />
                <text x={PAD_LEFT - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--cr-text-muted)">
                  {Math.round(v)}
                </text>
              </g>
            )
          })}

          {bars.map((bar, i) => (
            <g
              key={bar.month}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <rect x={bar.cx - slotWidth / 2} y={PAD_TOP} width={slotWidth} height={chartHeight} fill="transparent" />
              {bar.returningAdvertisers > 0 && (
                <rect
                  x={bar.cx - barWidth / 2}
                  y={bar.returningY}
                  width={barWidth}
                  height={bar.returningH}
                  rx={bar.newAdvertisers > 0 ? 0 : 4}
                  fill="var(--cr-chart-returning)"
                  opacity={hovered === null || hovered === i ? 1 : 0.4}
                />
              )}
              {bar.newAdvertisers > 0 && (
                <rect
                  x={bar.cx - barWidth / 2}
                  y={bar.newY}
                  width={barWidth}
                  height={bar.newH}
                  rx={4}
                  fill="var(--cr-chart-new)"
                  opacity={hovered === null || hovered === i ? 1 : 0.4}
                />
              )}
              {i % labelStride === 0 && (
                <text x={bar.cx} y={VIEW_H - PAD_BOTTOM + 16} textAnchor="middle" fontSize={9} fill="var(--cr-text-muted)">
                  {bar.label.split(' ')[0]}
                </text>
              )}
            </g>
          ))}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(active.cx / VIEW_W) * 100}%`,
              top: `${(active.topY / VIEW_H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
              borderColor: 'var(--cr-border)',
              background: 'var(--cr-bg-card)',
            }}
          >
            <p className="font-semibold text-[var(--cr-text-1)]">{active.label}</p>
            <p className="flex items-center gap-1.5 text-[var(--cr-text-2)]">
              <span aria-hidden style={{ color: 'var(--cr-chart-new)' }}>●</span>
              New: <strong className="text-[var(--cr-text-1)]">{active.newAdvertisers}</strong>
            </p>
            <p className="flex items-center gap-1.5 text-[var(--cr-text-2)]">
              <span aria-hidden style={{ color: 'var(--cr-chart-returning)' }}>●</span>
              Returning: <strong className="text-[var(--cr-text-1)]">{active.returningAdvertisers}</strong>
            </p>
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-[var(--cr-text-2)]">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-[var(--cr-text-muted)]">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 font-medium">New</th>
              <th className="py-1 font-medium">Returning</th>
              <th className="py-1 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.month} className="border-t" style={{ borderColor: 'var(--cr-border-soft)' }}>
                <td className="py-1 text-[var(--cr-text-1)]">{d.label}</td>
                <td className="py-1 text-[var(--cr-text-1)]">{d.newAdvertisers}</td>
                <td className="py-1 text-[var(--cr-text-1)]">{d.returningAdvertisers}</td>
                <td className="py-1 text-[var(--cr-text-1)]">{d.newAdvertisers + d.returningAdvertisers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
