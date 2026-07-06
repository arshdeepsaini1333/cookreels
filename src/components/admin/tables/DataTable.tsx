import { EmptyState } from '@/components/admin/ui/EmptyState'

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyMessage?: string
}

// Generic, reusable table primitive for future modules (Campaigns, Users, etc).
export function DataTable<T>({ columns, rows, getRowKey, emptyMessage }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title="No records yet" message={emptyMessage} />
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border"
      style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--cr-border)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={getRowKey(row)}
              className="border-b last:border-0 hover:bg-[var(--cr-accent-soft)]/40 transition-colors"
              style={{ borderColor: 'var(--cr-border-soft)' }}
            >
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-3 text-[var(--cr-text-1)] ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
