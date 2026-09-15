'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type AuthModalMode = 'login' | 'signup'

interface AuthModalState {
  isOpen: boolean
  mode: AuthModalMode
}

interface AuthModalContextValue {
  isAuthenticated: boolean
  isOpen: boolean
  mode: AuthModalMode
  open: (mode?: AuthModalMode, onSuccess?: () => void) => void
  close: () => void
  /** Switches the Login/Signup tab without touching the queued pending action. */
  switchMode: (mode: AuthModalMode) => void
  /** Called by AuthModal itself once login/signup succeeds. */
  handleSuccess: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean
  children: React.ReactNode
}) {
  const [state, setState] = useState<AuthModalState>({ isOpen: false, mode: 'login' })
  const pendingActionRef = useRef<(() => void) | null>(null)

  const open = useCallback((mode: AuthModalMode = 'login', onSuccess?: () => void) => {
    pendingActionRef.current = onSuccess ?? null
    setState({ isOpen: true, mode })
  }, [])

  const close = useCallback(() => {
    pendingActionRef.current = null
    setState(s => ({ ...s, isOpen: false }))
  }, [])

  const switchMode = useCallback((mode: AuthModalMode) => {
    setState(s => ({ ...s, mode }))
  }, [])

  const handleSuccess = useCallback(() => {
    const pending = pendingActionRef.current
    pendingActionRef.current = null
    setState(s => ({ ...s, isOpen: false }))
    pending?.()
  }, [])

  const value = useMemo<AuthModalContextValue>(() => ({
    isAuthenticated,
    isOpen: state.isOpen,
    mode: state.mode,
    open,
    close,
    switchMode,
    handleSuccess,
  }), [isAuthenticated, state, open, close, switchMode, handleSuccess])

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModalContext(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModalContext must be used within an AuthModalProvider')
  return ctx
}
