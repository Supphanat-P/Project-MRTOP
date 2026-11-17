import fs from 'node:fs'
import mysql from 'mysql2/promise'
import { dbConfig, DB_NAME, LIFETIME_LAST_YEAR } from './db.js'
import { clearAll, seedDatabase } from './seed.js'

const reset = process.argv.includes('--reset')
const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8').replaceAll('yawiset_pos', DB_NAME)

let conn
try {
  conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true })
  await conn.query(sql)
  console.log(`สร้างตารางในฐานข้อมูล "${DB_NAME}" แล้ว`)
  await conn.query(`USE \`${DB_NAME}\``)
  const [[col]] = await conn.query("SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'role'", [DB_NAME])
  if (col?.t.includes('cashier')) {
    const [r] = await conn.query("UPDATE staff SET role = 'pharmacist' WHERE role = 'cashier'")
    await conn.query("ALTER TABLE staff MODIFY role ENUM('admin','pharmacist') NOT NULL")
    console.log(`ปรับบทบาทเหลือ 2 แบบแล้ว (ย้ายพนักงานขาย ${r.affectedRows} คนเป็นเภสัชกร)`)
  }
  const [cols] = await conn.query("SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers'", [DB_NAME])
  if (!cols.some((x) => x.c === 'member_no')) {
    await conn.query(`ALTER TABLE customers
      ADD COLUMN member_no VARCHAR(20) NULL AFTER id,
      ADD COLUMN birth_date DATE NULL AFTER phone,
      ADD COLUMN note VARCHAR(300) NULL AFTER allergies,
      ADD COLUMN consent_at DATETIME NULL AFTER note,
      ADD UNIQUE KEY uq_member_no (member_no),
      ADD KEY ix_customer_phone (phone)`)
    await conn.query("UPDATE customers SET phone = NULLIF(REGEXP_REPLACE(phone, '[^0-9]', ''), '')")
    const [old] = await conn.query("SELECT id FROM customers WHERE id <> 'c1' ORDER BY created_at, id")
    for (const [i, c] of old.entries()) {
      await conn.query('UPDATE customers SET member_no = ? WHERE id = ?', ['M' + String(i + 1).padStart(5, '0'), c.id])
    }
    console.log(`เพิ่มระบบสมาชิกแล้ว (ให้รหัสสมาชิกกับลูกค้าเดิม ${old.length} คน)`)
  }
  const [mcols] = await conn.query("SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stock_moves'", [DB_NAME])
  if (!mcols.some((x) => x.c === 'detail')) {
    await conn.query('ALTER TABLE stock_moves ADD COLUMN balance INT NULL AFTER qty, ADD COLUMN detail VARCHAR(500) NULL AFTER note')
    console.log('เพิ่มคอลัมน์คงเหลือและรายละเอียดในประวัติสต็อกแล้ว')
  }
  const [lic] = await conn.query(`UPDATE staff SET lic_expires = CASE WHEN YEAR(lic_issued) <= ${LIFETIME_LAST_YEAR} THEN NULL ELSE DATE_ADD(lic_issued, INTERVAL 5 YEAR) END
    WHERE lic_no IS NOT NULL AND lic_issued IS NOT NULL`)
  if (lic.changedRows) console.log(`ปรับวันหมดอายุใบอนุญาตตามวันออกใบอนุญาตแล้ว ${lic.changedRows} คน`)
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM staff')
  if (n > 0 && !reset) {
    console.log('มีข้อมูลอยู่แล้ว - ข้ามการใส่ข้อมูลตัวอย่าง (ใช้ npm run db:reset เพื่อล้างแล้วใส่ใหม่)')
  } else {
    await conn.beginTransaction()
    await clearAll(conn)
    await seedDatabase(conn)
    await conn.commit()
    console.log('ใส่ข้อมูลตัวอย่างแล้ว - PIN: 1111 เจ้าของร้าน, 2222 เภสัชกร')
  }
} catch (e) {
  console.error('ตั้งค่าฐานข้อมูลไม่สำเร็จ:', e.message)
  if (e.code === 'ER_ACCESS_DENIED_ERROR') console.error('  ตรวจสอบ DB_USER / DB_PASSWORD ในไฟล์ .env (ชุดเดียวกับที่ล็อกอิน MySQL Workbench)')
  process.exitCode = 1
} finally {
  await conn?.end()
}
