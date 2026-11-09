export const uid = () => Math.random().toString(36).slice(2, 10)

export const baht = (n) =>
  '฿' + (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const today = () => new Date().toISOString().slice(0, 10)

export const daysUntil = (dateStr) => {
  if (!dateStr) return Infinity
  const a = new Date(today())
  const b = new Date(dateStr)
  return Math.round((b - a) / 86400000)
}

export const thDate = (s, withTime = false) => {
  if (!s) return '-'
  const dt = new Date(s)
  return dt.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export const stockOf = (p) => p.lots.reduce((s, l) => s + (daysUntil(l.exp) >= 0 ? l.qty : 0), 0)
export const expiredQty = (p) => p.lots.reduce((s, l) => s + (daysUntil(l.exp) < 0 ? l.qty : 0), 0)

export const licenseStatus = (lic) => {
  if (!lic) return { key: 'none', label: 'ไม่มีใบอนุญาต', cls: 'muted' }
  const n = daysUntil(lic.expires)
  if (n < 0) return { key: 'expired', label: 'หมดอายุแล้ว', cls: 'danger', days: n }
  if (n <= 60) return { key: 'soon', label: `ใกล้หมดอายุ (${n} วัน)`, cls: 'warn', days: n }
  return { key: 'ok', label: 'ใช้งานได้', cls: 'ok', days: n }
}

export const ROLE_LABEL = { admin: 'ผู้ดูแล/เภสัชกร', pharmacist: 'เภสัชกร', cashier: 'พนักงานขาย' }

export const downloadCSV = (filename, rows) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
