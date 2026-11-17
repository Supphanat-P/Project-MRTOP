export const CATEGORIES = [
  'ยาสามัญประจำบ้าน',
  'ยาอันตราย',
  'ยาควบคุมพิเศษ',
  'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย',
  'เวชสำอาง',
  'อุปกรณ์การแพทย์',
  'อาหารเสริม',
]
export const CATEGORY_INFO = {
  'ยาควบคุมพิเศษ': {
    cls: 'cat-controlled',
    badgeText: 'ยาควบคุมพิเศษ',
    desc: 'ต้องมีใบสั่งแพทย์กำกับ',
  },
  'ยาอันตราย': {
    cls: 'cat-danger',
    badgeText: 'ยาอันตราย',
    desc: 'ต้องจ่ายโดยเภสัชกร',
  },
  'ยาสามัญประจำบ้าน': {
    cls: 'cat-household',
    badgeText: 'ยาสามัญประจำบ้าน',
    desc: 'ยาสามัญประจำบ้าน',
  },
  'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย': {
    cls: 'cat-packaged',
    badgeText: 'ยาบรรจุเสร็จ',
    desc: 'ยาบรรจุเสร็จทั่วไป',
  },
  'เวชสำอาง': {
    cls: 'cat-cosmetic',
    badgeText: 'เวชสำอาง',
    desc: 'เวชสำอาง',
  },
  'อุปกรณ์การแพทย์': {
    cls: 'cat-medical',
    badgeText: 'อุปกรณ์การแพทย์',
    desc: 'อุปกรณ์ทางการแพทย์',
  },
  'อาหารเสริม': {
    cls: 'cat-supplement',
    badgeText: 'อาหารเสริม',
    desc: 'ผลิตภัณฑ์เสริมอาหาร',
  },
}
export const PHARMACIST_ONLY = ['ยาอันตราย', 'ยาควบคุมพิเศษ']
export const UNITS = ['แผง', 'เม็ด', 'แคปซูล', 'ขวด', 'ซอง', 'กล่อง', 'หลอด', 'ชิ้น']
export const ROLE_LABEL = { admin: 'เจ้าของร้าน', pharmacist: 'เภสัชกร' }
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

export const fmtPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '')
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
  return d
}

export const matchMember = (c, q) => {
  const k = q.trim().toLowerCase()
  if (!k || !c.memberNo) return false
  const digits = k.replace(/[\s-]/g, '')
  return c.name.toLowerCase().includes(k) || c.memberNo.toLowerCase().includes(k) ||
    (/^\d+$/.test(digits) && c.phone.includes(digits))
}

export const blankMember = (prefill = '') => {
  const digits = prefill.replace(/[\s-]/g, '')
  const isPhone = /^\d+$/.test(digits)
  return { id: '', name: isPhone ? '' : prefill.trim(), phone: isPhone ? digits : '', birthDate: '', allergies: '', note: '', consent: false }
}

export const memberStats = (receipts, id) => {
  const rs = receipts.filter((r) => r.customerId === id && !r.voided)
  return { visits: rs.length, total: rs.reduce((s, r) => s + r.total, 0), last: rs.at(-1)?.at }
}

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
