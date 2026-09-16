// Content moderation (Recipes/Reels) is scoped to a single admin, regardless of role —
// not governed by the general ADMIN_ROLE_PERMISSIONS map in permissions.ts.
export const RECIPES_REELS_ADMIN_EMAILS = ['kaurarshdeep697@gmail.com']

export function canAccessRecipesReels(email: string): boolean {
  return RECIPES_REELS_ADMIN_EMAILS.includes(email.toLowerCase())
}
