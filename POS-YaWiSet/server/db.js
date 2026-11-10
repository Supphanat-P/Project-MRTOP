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

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
