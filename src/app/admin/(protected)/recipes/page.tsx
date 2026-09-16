import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Eye, Star, PenLine } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { Forbidden } from '@/components/admin/ui/Forbidden'
import { DataTable, type DataTableColumn } from '@/components/admin/tables/DataTable'
import { ContentStatusBadges } from '@/components/admin/ui/ContentStatusBadges'
import { RecipeFilters } from '@/components/admin/recipes/RecipeFilters'
import { RecipeActionsMenu } from '@/components/admin/recipes/RecipeActionsMenu'
import { getAdminRecipes, type AdminRecipeListItem, type AdminRecipeListFilters } from '@/lib/admin/recipes'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'

export const metadata: Metadata = { title: 'Recipes | CookReels Admin' }

const number = new Intl.NumberFormat('en-IN')

const VALID_STATUSES: NonNullable<AdminRecipeListFilters['status']>[] = ['published', 'unpublished', 'banned', 'trending']

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function AdminRecipesPage({ searchParams }: PageProps) {
  const admin = await getAdminSession()
  const breadcrumb = [{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Recipes' }]

  if (!admin || !canAccessRecipesReels(admin.email)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Recipes" breadcrumb={breadcrumb} />
        <Forbidden />
      </div>
    )
  }

  const params = await searchParams
  const status = params.status && VALID_STATUSES.includes(params.status as NonNullable<AdminRecipeListFilters['status']>)
    ? (params.status as AdminRecipeListFilters['status'])
    : undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { items, total, limit } = await getAdminRecipes({ status, search: params.search, page })
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const columns: DataTableColumn<AdminRecipeListItem>[] = [
    {
      key: 'title',
      header: 'Recipe',
      render: r => (
        <Link href={`/admin/recipes/${r.id}`} className="flex items-center gap-3 hover:text-[var(--cr-accent)]">
          {r.coverImage ? (
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
              <Image src={r.coverImage} alt={r.title} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="h-10 w-10 flex-shrink-0 rounded-lg" style={{ background: 'var(--cr-accent-soft)' }} />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.title}</p>
            <p className="truncate text-xs text-[var(--cr-text-muted)]">
              @{r.author.username} &middot; {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: r => <ContentStatusBadges isPublished={r.isPublished} isTrending={r.isTrending} isBanned={r.isBanned} />,
    },
    {
      key: 'rating',
      header: 'Rating',
      className: 'text-right',
      render: r => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <Star size={13} className="text-[var(--cr-text-muted)]" />
          {r.avgRating.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'likes',
      header: 'Likes',
      className: 'text-right',
      render: r => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <Heart size={13} className="text-[var(--cr-text-muted)]" />
          {number.format(r.likeCount)}
        </span>
      ),
    },
    {
      key: 'views',
      header: 'Views',
      className: 'text-right',
      render: r => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <Eye size={13} className="text-[var(--cr-text-muted)]" />
          {number.format(r.viewCount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-20',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/recipes/${r.id}?edit=1`}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--cr-accent-soft)]"
            style={{ color: 'var(--cr-text-muted)' }}
            aria-label="Edit recipe"
            title="Edit"
          >
            <PenLine size={15} />
          </Link>
          <RecipeActionsMenu id={r.id} isPublished={r.isPublished} isTrending={r.isTrending} isBanned={r.isBanned} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes" breadcrumb={breadcrumb} />

      <RecipeFilters />

      <DataTable columns={columns} rows={items} getRowKey={r => r.id} emptyMessage="No recipes match these filters yet." />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--cr-text-2)]">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/recipes?${new URLSearchParams({ ...(status ? { status } : {}), ...(params.search ? { search: params.search } : {}), page: String(p) }).toString()}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg font-semibold transition-colors"
              style={p === page
                ? { background: 'var(--cr-accent)', color: 'var(--cr-btn-text)' }
                : { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
