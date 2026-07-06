'use client'

import { useState } from 'react'
import type { MonthlyRevenue } from '@/lib/admin/dashboard-stats'
import { EmptyState } from '@/components/admin/ui/EmptyState'

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[]
}

const VIEW_W = 640
const VIEW_H = 280
const PAD_LEFT = 46
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 30

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compactCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 })

function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
        <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Monthly Revenue</h3>
        <div className="mt-4">
          <EmptyState title="No revenue yet" message="Monthly revenue will appear once payments are recorded." />
        </div>
      </div>
    )
  }

  const chartWidth = VIEW_W - PAD_LEFT - PAD_RIGHT
  const chartHeight = VIEW_H - PAD_TOP - PAD_BOTTOM
  const max = niceMax(Math.max(...data.map(d => d.amount)))
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0
  const labelStride = Math.max(1, Math.ceil(data.length / 8))

  const points = data.map((d, i) => ({
    ...d,
    x: PAD_LEFT + stepX * i,
    y: PAD_TOP + chartHeight * (1 - d.amount / max),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_TOP + chartHeight} L ${points[0].x} ${PAD_TOP + chartHeight} Z`
  const gridValues = [0, max / 2, max]
  const active = hovered !== null ? points[hovered] : null
  const last = points[points.length - 1]

  return (
    <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
      <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Monthly Revenue</h3>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-56 w-full" role="img" aria-label="Monthly revenue trend">
          {gridValues.map(v => {
            const y = PAD_TOP + chartHeight * (1 - v / max)
            return (
              <g key={v}>
                <line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={y} y2={y} stroke="var(--cr-border-soft)" strokeWidth={1} />
                <text x={PAD_LEFT - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--cr-text-muted)">
                  {compactCurrency.format(v)}
                </text>
              </g>
            )
          })}

          <path d={areaPath} fill="var(--cr-chart-revenue)" opacity={0.1} stroke="none" />
          <path d={linePath} fill="none" stroke="var(--cr-chart-revenue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) =>
            i % labelStride === 0 ? (
              <text key={p.month} x={p.x} y={VIEW_H - PAD_BOTTOM + 16} textAnchor="middle" fontSize={9} fill="var(--cr-text-muted)">
                {p.label.split(' ')[0]}
              </text>
            ) : null
          )}

          <circle cx={last.x} cy={last.y} r={4} fill="var(--cr-chart-revenue)" stroke="var(--cr-bg-card)" strokeWidth={2} />
          <text x={last.x} y={last.y - 10} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--cr-text-1)">
            {currency.format(last.amount)}
          </text>

          {active && (
            <>
              <line x1={active.x} x2={active.x} y1={PAD_TOP} y2={PAD_TOP + chartHeight} stroke="var(--cr-text-muted)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={active.x} cy={active.y} r={4} fill="var(--cr-chart-revenue)" stroke="var(--cr-bg-card)" strokeWidth={2} />
            </>
          )}

          <rect
            x={PAD_LEFT}
            y={PAD_TOP}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            onMouseMove={event => {
              const svg = event.currentTarget.closest('svg')
              if (!svg) return
              const rect = svg.getBoundingClientRect()
              const localX = (event.clientX - rect.left) * (VIEW_W / rect.width)
              const index = Math.round((localX - PAD_LEFT) / (stepX || 1))
              setHovered(Math.min(Math.max(index, 0), points.length - 1))
            }}
            onMouseLeave={() => setHovered(null)}
          />
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(active.x / VIEW_W) * 100}%`,
              top: `${(active.y / VIEW_H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
              borderColor: 'var(--cr-border)',
              background: 'var(--cr-bg-card)',
            }}
          >
            <p className="font-semibold text-[var(--cr-text-1)]">{active.label}</p>
            <p className="text-[var(--cr-text-2)]">
              Revenue: <strong className="text-[var(--cr-text-1)]">{currency.format(active.amount)}</strong>
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
              <th className="py-1 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.month} className="border-t" style={{ borderColor: 'var(--cr-border-soft)' }}>
                <td className="py-1 text-[var(--cr-text-1)]">{d.label}</td>
                <td className="py-1 text-[var(--cr-text-1)]">{currency.format(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
