import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Eye, Star, MessageCircle, Bookmark, PenLine } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { Forbidden } from '@/components/admin/ui/Forbidden'
import { ContentStatusBadges } from '@/components/admin/ui/ContentStatusBadges'
import { RecipeActionsMenu } from '@/components/admin/recipes/RecipeActionsMenu'
import { RecipeForm, type RecipeFormValues } from '@/components/admin/recipes/RecipeForm'
import { getAdminRecipeById } from '@/lib/admin/recipes'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'

const number = new Intl.NumberFormat('en-IN')

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export const metadata: Metadata = { title: 'Recipe Details | CookReels Admin' }

export default async function AdminRecipeDetailPage({ params, searchParams }: PageProps) {
  const admin = await getAdminSession()
  if (!admin || !canAccessRecipesReels(admin.email)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Recipe" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Recipes', href: '/admin/recipes' }, { label: 'Details' }]} />
        <Forbidden />
      </div>
    )
  }

  const { id } = await params
  const { edit } = await searchParams

  const recipe = await getAdminRecipeById(id)
  if (!recipe) notFound()

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Recipes', href: '/admin/recipes' },
    { label: recipe.title },
  ]

  if (edit) {
    const initialValues: Partial<RecipeFormValues> = {
      title: recipe.title,
      description: recipe.description ?? '',
      coverImage: recipe.coverImage ?? '',
      cuisine: recipe.cuisine ?? '',
      cookTime: recipe.cookTime ? String(recipe.cookTime) : '',
      prepTime: recipe.prepTime ? String(recipe.prepTime) : '',
      servings: recipe.servings ? String(recipe.servings) : '',
      calories: recipe.calories ? String(recipe.calories) : '',
      difficulty: recipe.difficulty ?? '',
      isVeg: recipe.isVeg,
      categoryIds: recipe.categories.map(c => c.id),
      isPublished: recipe.isPublished,
      isTrending: recipe.isTrending,
      isBanned: recipe.isBanned,
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={`Edit "${recipe.title}"`} breadcrumb={breadcrumb} />
        <div className="max-w-3xl rounded-2xl border p-6 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <RecipeForm recipeId={recipe.id} initialValues={initialValues} />
        </div>
      </div>
    )
  }

  const kpis = [
    { label: 'Rating', value: `${recipe.avgRating.toFixed(1)} (${number.format(recipe.ratingCount)})`, icon: Star },
    { label: 'Likes', value: number.format(recipe.likeCount), icon: Heart },
    { label: 'Comments', value: number.format(recipe.commentCount), icon: MessageCircle },
    { label: 'Saves', value: number.format(recipe.savedCount), icon: Bookmark },
    { label: 'Views', value: number.format(recipe.viewCount), icon: Eye },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={recipe.title}
        breadcrumb={breadcrumb}
        action={
          <div className="flex items-center gap-3">
            <ContentStatusBadges isPublished={recipe.isPublished} isTrending={recipe.isTrending} isBanned={recipe.isBanned} />
            <Link
              href={`/admin/recipes/${recipe.id}?edit=1`}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
            >
              <PenLine size={15} /> Edit
            </Link>
            <RecipeActionsMenu id={recipe.id} isPublished={recipe.isPublished} isTrending={recipe.isTrending} isBanned={recipe.isBanned} />
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
          <h3 className="mb-4 text-sm font-semibold text-[var(--cr-text-1)]">Recipe Details</h3>
          {recipe.coverImage && (
            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl">
              <Image src={recipe.coverImage} alt={recipe.title} fill className="object-cover" unoptimized />
            </div>
          )}
          {recipe.description && <p className="mb-4 whitespace-pre-wrap text-sm text-[var(--cr-text-2)]">{recipe.description}</p>}
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--cr-text-muted)]">Cuisine</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.cuisine ?? '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Difficulty</dt><dd className="font-medium text-[var(--cr-text-1)] capitalize">{recipe.difficulty?.toLowerCase() ?? '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Prep time</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.prepTime ? `${recipe.prepTime} min` : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Cook time</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.cookTime ? `${recipe.cookTime} min` : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Servings</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.servings ?? '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Calories</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.calories ?? '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Vegetarian</dt><dd className="font-medium text-[var(--cr-text-1)]">{recipe.isVeg ? 'Yes' : 'No'}</dd></div>
          </dl>
          {recipe.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.categories.map(c => (
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
            {recipe.author.profileImage ? (
              <div className="relative h-11 w-11 overflow-hidden rounded-full">
                <Image src={recipe.author.profileImage} alt={recipe.author.name} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}>
                {recipe.author.name.slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--cr-text-1)]">{recipe.author.name || `@${recipe.author.username}`}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">@{recipe.author.username}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">{recipe.author.email}</p>
            </div>
          </div>
          {recipe.isBanned && recipe.bannedAt && (
            <div className="mt-4 border-t pt-4 text-xs text-[var(--cr-text-muted)]" style={{ borderColor: 'var(--cr-border-soft)' }}>
              Banned on {new Date(recipe.bannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
