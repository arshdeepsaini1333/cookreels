import {
  LayoutDashboard, Megaphone, Building2,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/lib/admin/permissions'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  moduleKey: ModuleKey
}

// Single source of truth for the admin sidebar + breadcrumb generation.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard, moduleKey: 'dashboard' },
  { label: 'Campaigns',   href: '/admin/campaigns',   icon: Megaphone,       moduleKey: 'campaigns' },
  { label: 'Advertisers', href: '/admin/advertisers', icon: Building2,       moduleKey: 'advertisers' },
]
