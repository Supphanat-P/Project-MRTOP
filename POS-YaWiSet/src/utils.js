export const CATEGORIES = [
  'ยาสามัญประจำบ้าน',
  'ยาอันตราย',
  'ยาควบคุมพิเศษ',
  'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย',
  'เวชสำอาง',
  'อุปกรณ์การแพทย์',
  'อาหารเสริม',
]
export const PHARMACIST_ONLY = ['ยาอันตราย', 'ยาควบคุมพิเศษ']
export const UNITS = ['แผง', 'เม็ด', 'แคปซูล', 'ขวด', 'ซอง', 'กล่อง', 'หลอด', 'ชิ้น']
export const ROLE_LABEL = { admin: 'ผู้ดูแล / เภสัชกร', pharmacist: 'เภสัชกร', cashier: 'พนักงานขาย' }
export const PAY_LABEL = { cash: 'เงินสด', qr: 'พร้อมเพย์', card: 'บัตร' }
export const MOVE_LABEL = { receive: 'รับเข้า', sale: 'ขาย', write_off: 'ตัดจำหน่าย', void: 'คืนจากยกเลิกบิล', adjust: 'ปรับยอด' }
export const catIndex = (c) => Math.max(0, CATEGORIES.indexOf(c))

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

export const baht = (n) =>
  '฿' + (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const num = (n) => (Number(n) || 0).toLocaleString('th-TH')

export const today = (offset = 0) => {
  const t = new Date()
  t.setDate(t.getDate() + offset)
  return t.toLocaleDateString('sv-SE')
}
export const localDay = (iso) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '')

export const daysUntil = (dateStr) => {
  if (!dateStr) return Infinity
  return Math.round((new Date(dateStr + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
}

export const thDate = (s, withTime = false) => {
  if (!s) return '-'
  const dt = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  return dt.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
export const thDateLong = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

export const stockOf = (p) => p.lots.reduce((s, l) => s + (daysUntil(l.exp) >= 0 ? l.qty : 0), 0)
export const expiredQty = (p) => p.lots.reduce((s, l) => s + (daysUntil(l.exp) < 0 ? l.qty : 0), 0)
export const nextExp = (p) => p.lots.filter((l) => daysUntil(l.exp) >= 0).map((l) => l.exp).sort()[0]

export const expStatus = (exp) => {
  const n = daysUntil(exp)
  if (n < 0) return { cls: 'danger', label: 'หมดอายุ' }
  if (n <= 90) return { cls: 'warn', label: `อีก ${n} วัน` }
  return { cls: 'ok', label: thDate(exp) }
}

export const licenseStatus = (lic) => {
  if (!lic) return { key: 'none', label: 'ไม่มีใบอนุญาต', cls: 'muted' }
  const n = daysUntil(lic.expires)
  if (n < 0) return { key: 'expired', label: 'หมดอายุแล้ว', cls: 'danger', days: n }
  if (n <= 60) return { key: 'soon', label: `ใกล้หมดอายุ (${n} วัน)`, cls: 'warn', days: n }
  return { key: 'ok', label: 'ใช้งานได้', cls: 'ok', days: n }
}

export const downloadCSV = (filename, rows) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export const printModal = () => {
  document.body.classList.add('printing')
  window.print()
  document.body.classList.remove('printing')
}
