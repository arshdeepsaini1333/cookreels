import { prisma } from '@/lib/prisma'
import type { Difficulty, Prisma } from '@/generated/prisma'

// ─── List ─────────────────────────────────────────────────────────────────────

export type AdminRecipeListFilters = {
  status?: 'published' | 'unpublished' | 'banned' | 'trending'
  search?: string
  page?: number
  limit?: number
}

export type AdminRecipeListItem = {
  id: string
  title: string
  coverImage: string | null
  cuisine: string | null
  difficulty: Difficulty | null
  isPublished: boolean
  isTrending: boolean
  isBanned: boolean
  likeCount: number
  viewCount: number
  avgRating: number
  createdAt: Date
  author: { id: string; username: string; email: string }
}

export async function getAdminRecipes(filters: AdminRecipeListFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20))
  const skip = (page - 1) * limit

  const where: Prisma.RecipeWhereInput = {
    ...(filters.status === 'published' ? { isPublished: true } : {}),
    ...(filters.status === 'unpublished' ? { isPublished: false } : {}),
    ...(filters.status === 'banned' ? { isBanned: true } : {}),
    ...(filters.status === 'trending' ? { isTrending: true } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { cuisine: { contains: filters.search, mode: 'insensitive' } },
            { user: { username: { contains: filters.search, mode: 'insensitive' } } },
            { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        title: true,
        coverImage: true,
        cuisine: true,
        difficulty: true,
        isPublished: true,
        isTrending: true,
        isBanned: true,
        likeCount: true,
        viewCount: true,
        avgRating: true,
        createdAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
    }),
    prisma.recipe.count({ where }),
  ])

  const items: AdminRecipeListItem[] = recipes.map(r => ({
    id: r.id,
    title: r.title,
    coverImage: r.coverImage,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    isPublished: r.isPublished,
    isTrending: r.isTrending,
    isBanned: r.isBanned,
    likeCount: r.likeCount,
    viewCount: r.viewCount,
    avgRating: r.avgRating,
    createdAt: r.createdAt,
    author: r.user,
  }))

  return { items, total, page, limit }
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminRecipeById(id: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, profileImage: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true, emoji: true, group: true } } } },
    },
  })
  if (!recipe) return null

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    coverImage: recipe.coverImage,
    cuisine: recipe.cuisine,
    cookTime: recipe.cookTime,
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    calories: recipe.calories,
    difficulty: recipe.difficulty,
    isVeg: recipe.isVeg,
    avgRating: recipe.avgRating,
    ratingCount: recipe.ratingCount,
    likeCount: recipe.likeCount,
    commentCount: recipe.commentCount,
    savedCount: recipe.savedCount,
    viewCount: recipe.viewCount,
    isPublished: recipe.isPublished,
    isTrending: recipe.isTrending,
    isBanned: recipe.isBanned,
    bannedAt: recipe.bannedAt,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    author: {
      id: recipe.user.id,
      username: recipe.user.username,
      email: recipe.user.email,
      name: `${recipe.user.firstName} ${recipe.user.lastName}`.trim(),
      profileImage: recipe.user.profileImage,
    },
    categories: recipe.categories.map(c => c.category),
  }
}

export type AdminRecipeDetail = NonNullable<Awaited<ReturnType<typeof getAdminRecipeById>>>
