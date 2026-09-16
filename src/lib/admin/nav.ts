import {
  LayoutDashboard, Megaphone, Building2, BookOpen, Film,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/lib/admin/permissions'
import { RECIPES_REELS_ADMIN_EMAILS } from '@/lib/admin/recipesReelsAccess'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  moduleKey: ModuleKey
  // When set, only an admin whose email is in this list sees the item —
  // independent of (and in addition to) role-based ADMIN_ROLE_PERMISSIONS.
  restrictedToEmails?: string[]
}

// Single source of truth for the admin sidebar + breadcrumb generation.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard, moduleKey: 'dashboard' },
  { label: 'Campaigns',   href: '/admin/campaigns',   icon: Megaphone,       moduleKey: 'campaigns' },
  { label: 'Advertisers', href: '/admin/advertisers', icon: Building2,       moduleKey: 'advertisers' },
  { label: 'Recipes',     href: '/admin/recipes',     icon: BookOpen,        moduleKey: 'recipes', restrictedToEmails: RECIPES_REELS_ADMIN_EMAILS },
  { label: 'Reels',       href: '/admin/reels',       icon: Film,            moduleKey: 'reels',   restrictedToEmails: RECIPES_REELS_ADMIN_EMAILS },
]
