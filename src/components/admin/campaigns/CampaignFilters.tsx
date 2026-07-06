'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import type { CampaignStatus } from '@/generated/prisma'

const STATUS_OPTIONS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',             label: 'All statuses' },
  { value: 'DRAFT',           label: 'Draft' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'ACTIVE',          label: 'Live' },
  { value: 'PAUSED',          label: 'Paused' },
  { value: 'COMPLETED',       label: 'Completed' },
  { value: 'REJECTED',        label: 'Rejected' },
  { value: 'CANCELLED',       label: 'Cancelled' },
]

export function CampaignFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  // Debounce free-text search so we don't push a route change per keystroke.
  useEffect(() => {
    const current = searchParams.get('search') ?? ''
    if (search === current) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) params.set('search', search)
      else params.delete('search')
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') params.delete('status')
    else params.set('status', value)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by campaign or advertiser…"
          className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]"
          style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }}
        />
      </div>
      <select
        defaultValue={searchParams.get('status') ?? 'ALL'}
        onChange={e => handleStatusChange(e.target.value)}
        className="rounded-xl py-2 px-3 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]"
        style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
