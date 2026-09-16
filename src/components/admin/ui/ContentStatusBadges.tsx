import { CheckCircle2, EyeOff, Flame, Ban } from 'lucide-react'

// Shared moderation-status pills for Recipes and Reels (both share the same
// isPublished/isTrending/isBanned shape).
export function ContentStatusBadges({ isPublished, isTrending, isBanned }: { isPublished: boolean; isTrending: boolean; isBanned: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isBanned ? (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
          <Ban size={12} strokeWidth={2.2} /> Banned
        </span>
      ) : isPublished ? (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
          <CheckCircle2 size={12} strokeWidth={2.2} /> Published
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' }}>
          <EyeOff size={12} strokeWidth={2.2} /> Hidden
        </span>
      )}
      {isTrending && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(245,197,24,0.15)', color: '#F5C518' }}>
          <Flame size={12} strokeWidth={2.2} /> Trending
        </span>
      )}
    </div>
  )
}
