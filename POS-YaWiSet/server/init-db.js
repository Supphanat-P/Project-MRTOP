// สร้างฐานข้อมูล + ตาราง แล้วใส่ข้อมูลตัวอย่าง
//   npm run db:init   → สร้างตาราง, ใส่ข้อมูลตัวอย่างถ้ายังว่าง
//   npm run db:reset  → ล้างข้อมูลทั้งหมดแล้วใส่ข้อมูลตัวอย่างใหม่
import fs from 'node:fs'
import mysql from 'mysql2/promise'
import { dbConfig, DB_NAME } from './db.js'
import { clearAll, seedDatabase } from './seed.js'

const reset = process.argv.includes('--reset')
const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8').replaceAll('yawiset_pos', DB_NAME)

let conn
try {
  conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true })
  await conn.query(sql)
  console.log(`✔ สร้างตารางในฐานข้อมูล "${DB_NAME}" แล้ว`)
  await conn.query(`USE \`${DB_NAME}\``)
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM staff')
  if (n > 0 && !reset) {
    console.log('ℹ มีข้อมูลอยู่แล้ว — ข้ามการใส่ข้อมูลตัวอย่าง (ใช้ npm run db:reset เพื่อล้างแล้วใส่ใหม่)')
  } else {
    await conn.beginTransaction()
    await clearAll(conn)
    await seedDatabase(conn)
    await conn.commit()
    console.log('✔ ใส่ข้อมูลตัวอย่างแล้ว — PIN: 1111 ผู้ดูแล, 2222 เภสัชกร, 3333 พนักงานขาย')
  }
} catch (e) {
  console.error('✖ ตั้งค่าฐานข้อมูลไม่สำเร็จ:', e.message)
  if (e.code === 'ER_ACCESS_DENIED_ERROR') console.error('  ตรวจสอบ DB_USER / DB_PASSWORD ในไฟล์ .env (ชุดเดียวกับที่ล็อกอิน MySQL Workbench)')
  process.exitCode = 1
} finally {
  await conn?.end()
}
