import { Megaphone, UserPlus, Flag } from 'lucide-react'
import type { ActivityItem } from '@/lib/admin/dashboard-stats'
import { EmptyState } from '@/components/admin/ui/EmptyState'

const ICONS = {
  CAMPAIGN_CREATED: Megaphone,
  USER_REGISTERED: UserPlus,
  CONTENT_REPORTED: Flag,
} as const

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface RecentActivityFeedProps {
  items: ActivityItem[]
}

export function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet" message="Recent campaigns, sign-ups, and reports will show up here." />
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map(item => {
        const Icon = ICONS[item.type]
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--cr-accent-soft)]/40 transition-colors"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}
            >
              <Icon size={14} strokeWidth={2} />
            </div>
            <p className="flex-1 truncate text-sm text-[var(--cr-text-1)]">{item.label}</p>
            <span className="flex-shrink-0 text-xs text-[var(--cr-text-muted)]">{timeAgo(item.createdAt)}</span>
          </li>
        )
      })}
    </ul>
  )
}
