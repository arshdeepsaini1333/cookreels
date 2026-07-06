'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar'
import { AdminTopNav } from '@/components/admin/layout/AdminTopNav'
import type { AdminSessionPayload } from '@/lib/admin/session'

interface AdminShellProps {
  admin: AdminSessionPayload
  children: React.ReactNode
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ background: 'var(--cr-bg-main)' }}>
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopNav admin={admin} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
