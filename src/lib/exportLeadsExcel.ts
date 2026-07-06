import * as XLSX from 'xlsx'

export interface ExportableLead {
  id: string
  name: string
  mobile: string
  email: string | null
  notes: string | null
  status: string
  createdAt: string
}

function leadToRow(l: ExportableLead) {
  const d = new Date(l.createdAt)
  return {
    Name:   l.name,
    Mobile: l.mobile,
    Email:  l.email ?? '',
    Status: l.status,
    Notes:  l.notes ?? '',
    Date:   d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    Time:   d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  }
}

function download(wb: XLSX.WorkBook, filename: string) {
  const buf: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function safeFileSegment(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'campaign'
}

export function exportSingleLead(lead: ExportableLead, campaignName: string) {
  const ws = XLSX.utils.json_to_sheet([leadToRow(lead)])
  ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lead')
  download(wb, `lead_${safeFileSegment(lead.name)}_${safeFileSegment(campaignName)}.xlsx`)
}

export function exportAllLeads(leads: ExportableLead[], campaignName: string) {
  const ws = XLSX.utils.json_to_sheet(leads.map(leadToRow))
  ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'All Leads')
  download(wb, `leads_${safeFileSegment(campaignName)}.xlsx`)
}

export function exportDayWiseLeads(leads: ExportableLead[], campaignName: string) {
  const byDay = new Map<string, ExportableLead[]>()
  for (const l of leads) {
    const key = new Date(l.createdAt).toISOString().slice(0, 10) // YYYY-MM-DD
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(l)
  }
  const days = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a))

  const wb = XLSX.utils.book_new()

  const summaryRows = days.map(day => ({
    Date:  new Date(day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    Leads: byDay.get(day)!.length,
  }))
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  summaryWs['!cols'] = [{ wch: 16 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  for (const day of days) {
    const rows = byDay.get(day)!.map(leadToRow)
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }]
    // Sheet names can't exceed 31 chars or contain []:*?/\
    const sheetName = day.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  download(wb, `leads_daywise_${safeFileSegment(campaignName)}.xlsx`)
}
