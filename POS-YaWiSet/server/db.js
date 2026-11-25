import mysql from 'mysql2/promise'
import crypto from 'node:crypto'

export const DB_NAME = process.env.DB_NAME || 'yawiset_pos'

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  timezone: 'Z',
  dateStrings: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
}

export const pool = mysql.createPool({ ...dbConfig, database: DB_NAME, connectionLimit: 10 })

export async function tx(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const r = await fn(conn)
    await conn.commit()
    return r
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export const newId = () => crypto.randomBytes(5).toString('hex')

export const toDT = (iso) => new Date(iso || Date.now()).toISOString().slice(0, 19).replace('T', ' ')
export const fromDT = (s) => (s ? s.replace(' ', 'T') + 'Z' : null)

export const localDate = (offsetDays = 0) => {
  const t = new Date()
  t.setDate(t.getDate() + offsetDays)
  return t.toLocaleDateString('sv-SE')
}

export const validatePassword = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return 'กรุณากรอกรหัสผ่าน'
  if (pwd.length < 8) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
  if (!/[a-z]/.test(pwd)) return 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว'
  if (!/[A-Z]/.test(pwd)) return 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว'
  if (!/\d/.test(pwd)) return 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว'
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) {
    return 'รหัสผ่านต้องมีตัวอักษรพิเศษ (!@#$%^&*...) อย่างน้อย 1 ตัว'
  }
  return null
}

export const hashPin = (pin) => {
  const salt = crypto.randomBytes(16).toString('hex')
  return salt + ':' + crypto.scryptSync(String(pin), salt, 32).toString('hex')
}
export const verifyPin = (pin, stored) => {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const test = crypto.scryptSync(String(pin), salt, 32)
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'))
}
export const hashPassword = hashPin
export const verifyPassword = verifyPin

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

export const ALLERGY_GROUPS = {
  Penicillin: ['penicillin', 'amoxicillin', 'ampicillin', 'cloxacillin', 'dicloxacillin'],
  Cephalosporin: ['cefalexin', 'cephalexin', 'cefuroxime', 'cefixime', 'ceftriaxone', 'cefdinir'],
  Sulfa: ['sulfa', 'sulfamethoxazole', 'co-trimoxazole', 'sulfasalazine'],
  NSAIDs: ['ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'mefenamic', 'piroxicam', 'celecoxib', 'etoricoxib'],
}
export const cleanAllergens = (list) =>
  [...new Set((Array.isArray(list) ? list : []).map((a) => String(a || '').trim().slice(0, 60)).filter(Boolean))].slice(0, 20)
export const allergyHits = (product, allergens) => {
  const hay = `${product?.generic || ''} ${product?.name || ''}`.toLowerCase()
  return (allergens || []).filter((a) => (ALLERGY_GROUPS[a] || [a.toLowerCase()]).some((t) => t && hay.includes(t)))
}

export const LIFETIME_LAST_YEAR = 2015
export const LICENSE_NO_DIGITS = 5
export const isLicenseNo = (s) => /^ภ\.\d+$/.test(s || '') && s.length - 2 <= LICENSE_NO_DIGITS

export const licenseExpiry = (issued) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issued || '')
  if (!m) return null
  const [y, mo, d] = m.slice(1).map(Number)
  if (y <= LIFETIME_LAST_YEAR) return null
  const lastDay = new Date(Date.UTC(y + 5, mo, 0)).getUTCDate()
  return `${y + 5}-${m[2]}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

export const SELL_BEFORE_MONTHS = 6
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
export const isSellable = (exp, today) => today < sellCutoff(exp)
