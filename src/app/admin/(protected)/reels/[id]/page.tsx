import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Eye, MessageCircle, Bookmark, Clock, PenLine } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { Forbidden } from '@/components/admin/ui/Forbidden'
import { ContentStatusBadges } from '@/components/admin/ui/ContentStatusBadges'
import { ReelActionsMenu } from '@/components/admin/reels/ReelActionsMenu'
import { ReelForm, type ReelFormValues } from '@/components/admin/reels/ReelForm'
import { getAdminReelById } from '@/lib/admin/reels'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'

const number = new Intl.NumberFormat('en-IN')

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export const metadata: Metadata = { title: 'Reel Details | CookReels Admin' }

export default async function AdminReelDetailPage({ params, searchParams }: PageProps) {
  const admin = await getAdminSession()
  if (!admin || !canAccessRecipesReels(admin.email)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Reel" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reels', href: '/admin/reels' }, { label: 'Details' }]} />
        <Forbidden />
      </div>
    )
  }

  const { id } = await params
  const { edit } = await searchParams

  const reel = await getAdminReelById(id)
  if (!reel) notFound()

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Reels', href: '/admin/reels' },
    { label: reel.title },
  ]

  if (edit) {
    const initialValues: Partial<ReelFormValues> = {
      title: reel.title,
      description: reel.description ?? '',
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl ?? '',
      duration: reel.duration ? String(reel.duration) : '',
      gradient: reel.gradient ?? '',
      emoji: reel.emoji ?? '',
      categoryIds: reel.categories.map(c => c.id),
      isPublished: reel.isPublished,
      isTrending: reel.isTrending,
      isBanned: reel.isBanned,
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={`Edit "${reel.title}"`} breadcrumb={breadcrumb} />
        <div className="max-w-3xl rounded-2xl border p-6 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <ReelForm reelId={reel.id} initialValues={initialValues} />
        </div>
      </div>
    )
  }

  const kpis = [
    { label: 'Likes', value: number.format(reel.likeCount), icon: Heart },
    { label: 'Comments', value: number.format(reel.commentCount), icon: MessageCircle },
    { label: 'Saves', value: number.format(reel.savedCount), icon: Bookmark },
    { label: 'Views', value: number.format(reel.viewCount), icon: Eye },
    { label: 'Duration', value: reel.duration ? `${reel.duration}s` : '—', icon: Clock },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={reel.title}
        breadcrumb={breadcrumb}
        action={
          <div className="flex items-center gap-3">
            <ContentStatusBadges isPublished={reel.isPublished} isTrending={reel.isTrending} isBanned={reel.isBanned} />
            <Link
              href={`/admin/reels/${reel.id}?edit=1`}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
            >
              <PenLine size={15} /> Edit
            </Link>
            <ReelActionsMenu id={reel.id} isPublished={reel.isPublished} isTrending={reel.isTrending} isBanned={reel.isBanned} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl border p-4 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
            <k.icon size={16} className="mb-2 text-[var(--cr-accent)]" />
            <p className="text-lg font-heading font-bold text-[var(--cr-text-1)]">{k.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border p-5 shadow-premium lg:col-span-2" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--cr-text-1)]">Reel Details</h3>
          <video src={reel.videoUrl} poster={reel.thumbnailUrl ?? undefined} controls className="mb-4 max-h-96 w-full rounded-xl" />
          {reel.description && <p className="mb-4 whitespace-pre-wrap text-sm text-[var(--cr-text-2)]">{reel.description}</p>}
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--cr-text-muted)]">Duration</dt><dd className="font-medium text-[var(--cr-text-1)]">{reel.duration ? `${reel.duration}s` : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Emoji</dt><dd className="font-medium text-[var(--cr-text-1)]">{reel.emoji ?? '—'}</dd></div>
          </dl>
          {reel.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {reel.categories.map(c => (
                <span key={c.id} className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--cr-text-1)]">Author</h3>
          <div className="flex items-center gap-3">
            {reel.author.profileImage ? (
              <div className="relative h-11 w-11 overflow-hidden rounded-full">
                <Image src={reel.author.profileImage} alt={reel.author.name} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}>
                {reel.author.name.slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--cr-text-1)]">{reel.author.name || `@${reel.author.username}`}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">@{reel.author.username}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">{reel.author.email}</p>
            </div>
          </div>
          {reel.isBanned && reel.bannedAt && (
            <div className="mt-4 border-t pt-4 text-xs text-[var(--cr-text-muted)]" style={{ borderColor: 'var(--cr-border-soft)' }}>
              Banned on {new Date(reel.bannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
