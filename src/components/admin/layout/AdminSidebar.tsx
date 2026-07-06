'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChefHat, ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react'
import { ADMIN_NAV_ITEMS } from '@/lib/admin/nav'

interface AdminSidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function AdminSidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <>
      {/* Mobile backdrop — closes the drawer, never shown at lg+ where the sidebar is static */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-shrink-0 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0 lg:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: collapsed ? '76px' : '248px',
          background: 'var(--cr-bg-sidebar)',
          borderColor: 'var(--cr-border)',
        }}
      >
        <div className="flex h-16 items-center gap-2.5 px-4">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--cr-accent)', color: 'var(--cr-btn-text)' }}
          >
            <ChefHat size={18} strokeWidth={2} />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-heading font-bold text-[var(--cr-text-1)]">
              CookReels Admin
            </span>
          )}
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)] lg:hidden"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-2">
          {ADMIN_NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={onCloseMobile}
                className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--cr-accent-soft)' : 'transparent',
                  color: active ? 'var(--cr-accent)' : 'var(--cr-text-2)',
                }}
              >
                <Icon size={17} strokeWidth={1.9} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t px-2.5 py-2.5" style={{ borderColor: 'var(--cr-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 dark:text-red-400"
          >
            <LogOut size={17} strokeWidth={1.9} className="flex-shrink-0" />
            {!collapsed && 'Logout'}
          </button>
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)] lg:flex"
          >
            {collapsed ? (
              <ChevronsRight size={17} strokeWidth={1.9} className="flex-shrink-0" />
            ) : (
              <>
                <ChevronsLeft size={17} strokeWidth={1.9} className="flex-shrink-0" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
