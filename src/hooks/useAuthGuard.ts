'use client'

import { useCallback } from 'react'
import { useAuthModalContext, type AuthModalMode } from '@/context/AuthModalContext'

/**
 * Central guest/auth guard. Use `requireAuth` to wrap any action that needs
 * a logged-in user — it runs the action immediately when authenticated, or
 * opens the shared login/signup modal (queuing the action to run on success)
 * when it's a guest. Use `openAuthModal` directly when there's no action to
 * queue (e.g. a nav item that should never navigate for guests).
 */
export function useAuthGuard() {
  const { isAuthenticated, open } = useAuthModalContext()

  const requireAuth = useCallback((action: () => void, mode: AuthModalMode = 'login') => {
    if (isAuthenticated) {
      action()
      return
    }
    open(mode, action)
  }, [isAuthenticated, open])

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    open(mode)
  }, [open])

  return { isAuthenticated, requireAuth, openAuthModal }
}
