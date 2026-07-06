import type { AdminRole } from '@/generated/prisma'

export type ModuleKey =
  | 'dashboard'
  | 'campaigns'
  | 'advertisers'
  | 'audiences'
  | 'analytics'
  | 'users'
  | 'creators'
  | 'recipes'
  | 'reels'
  | 'moderation'
  | 'reports'
  | 'billing'
  | 'notifications'
  | 'settings'

const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'campaigns', 'advertisers', 'audiences', 'analytics',
  'users', 'creators', 'recipes', 'reels', 'moderation', 'reports',
  'billing', 'notifications', 'settings',
]

// Role → module access map. Not enforced in routes/UI yet — the spec asks for the
// architecture to exist ahead of enforcement. Wire this into AdminSidebar / a
// requireModuleAccess() proxy check once role-scoped access is actually needed.
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, ModuleKey[]> = {
  SUPER_ADMIN: ALL_MODULES,
  CAMPAIGN_MANAGER: ['dashboard', 'campaigns', 'analytics'],
  MODERATOR: ['dashboard', 'recipes', 'reels', 'reports'],
  ANALYST: ['dashboard', 'analytics'],
  SUPPORT: ['dashboard', 'users', 'settings'],
}

export function canAccess(role: AdminRole, moduleKey: ModuleKey): boolean {
  return ADMIN_ROLE_PERMISSIONS[role].includes(moduleKey)
}
