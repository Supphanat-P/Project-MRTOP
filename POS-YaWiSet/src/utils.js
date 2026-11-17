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
export const ROLE_LABEL = { admin: 'แอดมิน', pharmacist: 'เภสัชกร' }
export const PAY_LABEL = { cash: 'เงินสด', qr: 'พร้อมเพย์', card: 'บัตร' }
export const MOVE_LABEL = { receive: 'รับเข้า', sale: 'ขาย', write_off: 'ตัดสต็อก', void: 'คืนจากยกเลิกบิล', adjust: 'ปรับยอด' }
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

export const SELL_BEFORE_MONTHS = 6
export const SELL_SOON_DAYS = 90

export const addMonths = (s, n) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return null
  const t = +m[1] * 12 + (+m[2] - 1) + n
  const y = Math.floor(t / 12)
  const mo = t - y * 12 + 1
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  return `${y}-${String(mo).padStart(2, '0')}-${String(Math.min(+m[3], last)).padStart(2, '0')}`
}
export const sellCutoff = (exp) => addMonths(exp, -SELL_BEFORE_MONTHS)

export const lotStatus = (l) => {
  const cutoff = sellCutoff(l.exp)
  const n = daysUntil(cutoff)
  const left = daysUntil(l.exp)
  const base = { cutoff, days: n, sellable: n > 0, sellQty: n > 0 ? l.qty : 0 }
  if (left < 0) return { ...base, key: 'expired', cls: 'danger', label: 'หมดอายุ', note: `เลยวันหมดอายุมา ${-left} วัน` }
  if (n <= 0) return { ...base, key: 'expired', cls: 'danger', label: 'หมดอายุ', note: `เหลืออายุ ${left} วัน (ไม่ถึง ${SELL_BEFORE_MONTHS} เดือน) ห้ามขาย` }
  if (n <= SELL_SOON_DAYS) return { ...base, key: 'soon', cls: 'warn', label: `ขายได้อีก ${n} วัน`, note: `ต้องขายก่อน ${thDate(cutoff)}` }
  return { ...base, key: 'ok', cls: 'ok', label: `ขายได้อีก ${n} วัน`, note: `ขายได้ก่อน ${thDate(cutoff)}` }
}

export const totalQty = (p) => p.lots.reduce((s, l) => s + l.qty, 0)
export const stockOf = (p) => p.lots.reduce((s, l) => s + lotStatus(l).sellQty, 0)
export const expiredQty = (p) => totalQty(p) - stockOf(p)
export const nextLot = (p) => p.lots.filter((l) => lotStatus(l).sellable).sort((a, b) => (a.exp < b.exp ? -1 : 1))[0]

export const LIFETIME_LAST_YEAR = 2015
export const LICENSE_RENEW_DAYS = 150

export const renewFrom = (lic) => {
  if (!lic?.expires) return null
  const t = new Date(lic.expires + 'T00:00:00')
  t.setDate(t.getDate() - LICENSE_RENEW_DAYS)
  return t.toLocaleDateString('sv-SE')
}

export const licenseExpiry = (issued) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issued || '')
  if (!m) return null
  const [y, mo, d] = m.slice(1).map(Number)
  if (y <= LIFETIME_LAST_YEAR) return null
  const lastDay = new Date(Date.UTC(y + 5, mo, 0)).getUTCDate()
  return `${y + 5}-${m[2]}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export const isLifetime = (lic) => !!lic && !lic.expires

export const licenseUntil = (lic, long = false) => (isLifetime(lic) ? 'ตลอดชีพ' : long ? thDateLong(lic?.expires) : thDate(lic?.expires))

export const licenseStatus = (lic) => {
  if (!lic) return { key: 'none', label: 'ไม่มีใบอนุญาต', cls: 'muted' }
  if (isLifetime(lic)) return { key: 'ok', label: 'ตลอดชีพ', cls: 'ok', days: Infinity }
  const n = daysUntil(lic.expires)
  if (n < 0) return { key: 'expired', label: 'หมดอายุแล้ว', cls: 'danger', days: n }
  if (n <= LICENSE_RENEW_DAYS) return { key: 'soon', label: `ใกล้หมดอายุ (${n} วัน)`, cls: 'warn', days: n }
  return { key: 'ok', label: 'ใช้งานได้', cls: 'ok', days: n }
}

export const downloadCSV = (filename, rows) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export const checkPasswordCriteria = (pwd) => {
  const p = pwd || ''
  return {
    length: p.length >= 8,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    digit: /\d/.test(p),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p),
  }
}

export const isPasswordValid = (pwd) => {
  const c = checkPasswordCriteria(pwd)
  return c.length && c.lower && c.upper && c.digit && c.special
}

export const getPasswordError = (pwd) => {
  if (!pwd) return 'กรุณากรอกรหัสผ่าน'
  const c = checkPasswordCriteria(pwd)
  if (!c.length) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
  if (!c.lower) return 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว'
  if (!c.upper) return 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว'
  if (!c.digit) return 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว'
  if (!c.special) return 'รหัสผ่านต้องมีตัวอักษรพิเศษ (!@#$%^&*...) อย่างน้อย 1 ตัว'
  return null
}



