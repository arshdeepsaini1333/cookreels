'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
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

export function RecipeDeepLinkClient({
  recipes,
  initialIndex,
  profileUser,
  currentUserId,
  standalone = false,
}: RecipeDeepLinkClientProps) {
  const router = useRouter()

  const handleClose = useCallback(() => {
    if (standalone) {
      router.push('/explore')
    } else {
      router.back()
    }
  }, [standalone, router])

  // Keep the URL in sync as the user navigates the carousel.
  // Uses replaceState so individual carousel swipes don't pile up in browser history.
  const handleUrlChange = useCallback((id: string) => {
    window.history.replaceState({}, '', `/recipe/${id}`)
  }, [])

  return (
    <RecipeViewerModal
      recipes={recipes}
      initialIndex={initialIndex}
      user={profileUser}
      isOpen={true}
      onClose={handleClose}
      skipUrlManagement={true}
      onUrlChange={handleUrlChange}
      currentUserId={currentUserId}
    />
  )
}
