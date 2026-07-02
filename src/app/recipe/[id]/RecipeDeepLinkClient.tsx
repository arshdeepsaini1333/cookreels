'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RecipeViewerModal } from '@/components/shared/RecipeViewerModal'
import type { ProfileRecipe, ProfileUser } from '@/components/profile/ProfilePage'

export interface RecipeDeepLinkClientProps {
  recipes: ProfileRecipe[]
  initialIndex: number
  profileUser: ProfileUser
  currentUserId?: string
  /** true = direct URL access (/recipe/[id] standalone page) */
  standalone?: boolean
}

interface CtxItem {
  recipe: ProfileRecipe
  user: ProfileUser
}

async function fetchCtxItem(id: string): Promise<CtxItem | null> {
  try {
    const res = await fetch(`/api/recipes/${id}`)
    if (!res.ok) return null
    const d = await res.json()
    return {
      recipe: {
        id:          d.id,
        title:       d.title,
        coverImage:  d.coverImage,
        cookTime:    d.cookTime,
        prepTime:    d.prepTime,
        likeCount:   d.likeCount,
        difficulty:  d.difficulty,
        description: d.description,
        servings:    d.servings,
        createdAt:   d.createdAt,
      },
      user: {
        id:               d.user.id,
        name:             `${d.user.firstName} ${d.user.lastName}`.trim(),
        username:         d.user.username,
        bio:              d.user.bio ?? null,
        verified:         d.user.isVerified,
        topChef:          !!d.user.topChef,
        level:            'Chef',
        avatar:           d.user.profileImage,
        cuisineSpecialty: null,
      },
    }
  } catch {
    return null
  }
}

export function RecipeDeepLinkClient({
  recipes,
  initialIndex,
  profileUser,
  currentUserId,
  standalone = false,
}: RecipeDeepLinkClientProps) {
  const router = useRouter()

  // Read nav context from sessionStorage immediately (synchronous, no flash)
  const [ctxIds] = useState<string[] | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('__cr_nav_ctx')
      if (raw) {
        const ctx = JSON.parse(raw)
        if (ctx.type === 'recipe' && Array.isArray(ctx.ids) && ctx.ids.length > 0) {
          return ctx.ids as string[]
        }
      }
    } catch {}
    return null
  })

  const initialRecipe = recipes[initialIndex]
  const initialId      = initialRecipe?.id
  const initialCtxIdx  = ctxIds && initialId ? ctxIds.indexOf(initialId) : -1
  const inCtxMode      = ctxIds !== null && initialCtxIdx !== -1

  // ── Context navigation: purely local state, no Next.js route navigation ───
  // (a route navigation would remount this whole tree, killing the slide animation)
  const [ctxIdx,    setCtxIdx]    = useState(initialCtxIdx)
  const [ctxRecipe, setCtxRecipe] = useState<ProfileRecipe | null>(inCtxMode ? initialRecipe : null)
  const [ctxUser,   setCtxUser]   = useState<ProfileUser | null>(inCtxMode ? profileUser : null)

  const cacheRef = useRef<Map<string, CtxItem>>(new Map())
  useEffect(() => {
    if (inCtxMode && initialRecipe && initialId) {
      cacheRef.current.set(initialId, { recipe: initialRecipe, user: profileUser })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prefetch = useCallback((id: string | undefined) => {
    if (!id || cacheRef.current.has(id)) return
    fetchCtxItem(id).then(item => { if (item) cacheRef.current.set(id, item) })
  }, [])

  // Prefetch neighbors so navigation feels instant once the user clicks.
  useEffect(() => {
    if (!inCtxMode || !ctxIds) return
    prefetch(ctxIds[ctxIdx - 1])
    prefetch(ctxIds[ctxIdx + 1])
  }, [inCtxMode, ctxIds, ctxIdx, prefetch])

  const goToCtx = useCallback(async (targetIdx: number) => {
    if (!ctxIds) return
    const id = ctxIds[targetIdx]
    if (!id) return
    let item = cacheRef.current.get(id)
    if (!item) {
      const fetched = await fetchCtxItem(id)
      if (!fetched) return
      cacheRef.current.set(id, fetched)
      item = fetched
    }
    setCtxIdx(targetIdx)
    setCtxRecipe(item.recipe)
    setCtxUser(item.user)
    window.history.replaceState(null, '', `/recipe/${id}`)
  }, [ctxIds])

  const ctxHasPrev = inCtxMode && ctxIdx > 0
  const ctxHasNext = inCtxMode && ctxIds !== null && ctxIdx < ctxIds.length - 1

  const onCtxPrev = useCallback(() => { goToCtx(ctxIdx - 1) }, [goToCtx, ctxIdx])
  const onCtxNext = useCallback(() => { goToCtx(ctxIdx + 1) }, [goToCtx, ctxIdx])

  const handleClose = useCallback(() => {
    if (standalone) {
      router.push('/explore')
    } else {
      router.back()
    }
  }, [standalone, router])

  // Keep URL in sync as the user navigates the carousel (non-context mode only).
  const handleUrlChange = useCallback((id: string) => {
    window.history.replaceState({}, '', `/recipe/${id}`)
  }, [])

  const useCtx = inCtxMode && ctxRecipe !== null && ctxUser !== null

  return (
    <RecipeViewerModal
      recipes={useCtx ? [ctxRecipe] : recipes}
      initialIndex={useCtx ? 0 : initialIndex}
      user={useCtx ? ctxUser : profileUser}
      isOpen={true}
      onClose={handleClose}
      skipUrlManagement={true}
      onUrlChange={useCtx ? undefined : handleUrlChange}
      currentUserId={currentUserId}
      onCtxPrev={useCtx ? onCtxPrev : undefined}
      onCtxNext={useCtx ? onCtxNext : undefined}
      ctxHasPrev={useCtx ? ctxHasPrev : undefined}
      ctxHasNext={useCtx ? ctxHasNext : undefined}
    />
  )
}
