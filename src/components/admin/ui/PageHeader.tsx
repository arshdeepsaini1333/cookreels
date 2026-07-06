import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Breadcrumb = { label: string; href?: string }

interface PageHeaderProps {
  title: string
  breadcrumb: Breadcrumb[]
  action?: React.ReactNode
}

export function PageHeader({ title, breadcrumb, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-[var(--cr-text-muted)] mb-1.5">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} strokeWidth={2} />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--cr-accent)] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--cr-text-2)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-2xl font-heading font-bold text-[var(--cr-text-1)]">{title}</h1>
      </div>
      {action}
    </div>
  )
}
