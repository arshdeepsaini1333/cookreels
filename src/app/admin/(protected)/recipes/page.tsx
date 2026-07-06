import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Recipes | CookReels Admin' }

export default function AdminRecipesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Recipes' }]} />
      <EmptyState icon={BookOpen} title="Recipe management is coming soon" message="Browse, feature, and moderate published recipes from here once this module is built." />
    </div>
  )
}
