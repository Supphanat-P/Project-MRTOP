// ข้อมูลตัวอย่าง — ทุกชื่อ/เลขที่ใบอนุญาตเป็นข้อมูลสมมติ
import { hashPin, localDate as d } from './db.js'

const products = [
  ['p1', '8850001000011', 'พาราเซตามอล 500 มก.', 'Paracetamol', 'ยาสามัญประจำบ้าน', 'แผง', 15, 8, 30, 'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชม. เมื่อมีอาการ ไม่เกิน 8 เม็ด/วัน', [['PA2411', 80, 420], ['PA2402', 12, 25]]],
  ['p2', '8850001000028', 'อะม็อกซีซิลลิน 500 มก.', 'Amoxicillin', 'ยาอันตราย', 'แผง', 45, 22, 20, 'รับประทานครั้งละ 1 แคปซูล วันละ 3 ครั้ง หลังอาหาร ทานติดต่อกันจนหมด', [['AM2408', 40, 300]]],
  ['p3', '8850001000035', 'ลอราทาดีน 10 มก.', 'Loratadine', 'ยาอันตราย', 'แผง', 35, 15, 15, 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง', [['LR2405', 9, 200]]],
  ['p4', '8850001000042', 'ยาธาตุน้ำแดง 180 มล.', 'Mist. Carminative', 'ยาสามัญประจำบ้าน', 'ขวด', 39, 20, 10, 'ผู้ใหญ่รับประทานครั้งละ 1-2 ช้อนโต๊ะ วันละ 3 ครั้ง หลังอาหาร', [['TD2410', 24, 500]]],
  ['p5', '8850001000059', 'โอเมพราโซล 20 มก.', 'Omeprazole', 'ยาอันตราย', 'แผง', 60, 28, 15, 'รับประทานครั้งละ 1 แคปซูล วันละ 1 ครั้ง ก่อนอาหารเช้า 30 นาที', [['OM2401', 18, -5], ['OM2409', 30, 380]]],
  ['p6', '8850001000066', 'ผงเกลือแร่ ORS', 'Oral Rehydration Salts', 'ยาสามัญประจำบ้าน', 'ซอง', 8, 4, 50, 'ละลายน้ำต้มสุก 1 แก้ว (250 มล.) จิบบ่อย ๆ', [['OR2407', 150, 600]]],
  ['p7', '8850001000073', 'ทรามาดอล 50 มก.', 'Tramadol', 'ยาควบคุมพิเศษ', 'แคปซูล', 12, 5, 20, 'ตามแพทย์สั่ง', [['TR2406', 60, 250]]],
  ['p8', '8850001000080', 'หน้ากากอนามัย (50 ชิ้น)', '-', 'อุปกรณ์การแพทย์', 'กล่อง', 89, 45, 10, '', [['MK2410', 35, 900]]],
  ['p9', '8850001000097', 'วิตามินซี 1000 มก.', 'Ascorbic acid', 'อาหารเสริม', 'ขวด', 250, 140, 5, 'รับประทานวันละ 1 เม็ด หลังอาหาร', [['VC2408', 4, 60]]],
  ['p10', '8850001000103', 'แอลกอฮอล์ล้างแผล 70% 450 มล.', 'Ethyl alcohol', 'ยาสามัญประจำบ้าน', 'ขวด', 55, 30, 10, 'ใช้ภายนอก ห้ามรับประทาน', [['AL2409', 20, 700]]],
]

const LIC_TYPE = 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม'
const staff = [
  ['s1', 'ภก.', 'สมชาย ใจดี', 'admin', '1111', '#1A7A6E', ['ภ.99001', -1800, 1800, 'มหาวิทยาลัยตัวอย่าง', 'เภสัชศาสตรบัณฑิต']],
  ['s2', 'ภญ.', 'สุภาพร รักษ์ยา', 'pharmacist', '2222', '#7c3aed', ['ภ.99002', -1790, 20, 'มหาวิทยาลัยสาธิต', 'เภสัชศาสตรบัณฑิต (การบริบาลทางเภสัชกรรม)']],
  ['s3', 'นางสาว', 'มานี ขายเก่ง', 'cashier', '3333', '#ea580c', null],
]

const TABLES_CLEAR_ORDER = ['receipt_item_lots', 'receipt_items', 'receipts', 'stock_moves', 'product_lots', 'products', 'customers', 'staff', 'shop_settings']

export async function clearAll(conn) {
  for (const t of TABLES_CLEAR_ORDER) await conn.query(`DELETE FROM ${t}`)
}

export async function seedDatabase(conn) {
  await conn.query(
    'INSERT INTO shop_settings (id, shop_name, address, phone, tax_id, license_shop, prompt_pay, receipt_note) VALUES (1,?,?,?,?,?,?,?)',
    ['ร้านยาวิเศษ', '99/9 ถนนตัวอย่าง แขวงสาธิต เขตทดลอง กรุงเทพฯ 10000', '02-000-0000', '0-0000-00000-00-0',
      'ข.ย.1 เลขที่ 00/2569 (สมมติ)', '0000000000', 'ขอบคุณที่ใช้บริการ · ปรึกษาเภสัชกรได้ทุกวัน'],
  )
  for (const [id, title, name, role, pin, color, l] of staff) {
    await conn.query(
      `INSERT INTO staff (id, title, name, role, pin_hash, color, lic_no, lic_type, lic_issued, lic_expires, lic_university, lic_degree)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, title, name, role, hashPin(pin), color, l?.[0] ?? null, l ? LIC_TYPE : null, l ? d(l[1]) : null, l ? d(l[2]) : null, l?.[3] ?? null, l?.[4] ?? null],
    )
  }
  for (const c of [['c1', 'ลูกค้าทั่วไป', '', ''], ['c2', 'คุณวิภา สุขใจ', '081-000-0001', 'แพ้ Penicillin'], ['c3', 'คุณประเสริฐ มั่นคง', '081-000-0002', '']]) {
    await conn.query('INSERT INTO customers (id, name, phone, allergies) VALUES (?,?,?,?)', c)
  }
  const at = new Date().toISOString().slice(0, 19).replace('T', ' ')
  for (const [id, barcode, name, generic, category, unit, price, cost, min, dosage, lots] of products) {
    await conn.query(
      'INSERT INTO products (id, barcode, name, generic, category, unit, price, cost, min_stock, dosage) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, barcode, name, generic, category, unit, price, cost, min, dosage],
    )
    for (const [lotNo, qty, expIn] of lots) {
      await conn.query('INSERT INTO product_lots (product_id, lot_no, exp, qty) VALUES (?,?,?,?)', [id, lotNo, d(expIn), qty])
      await conn.query(
        "INSERT INTO stock_moves (at, type, product_id, name, lot_no, exp, qty, note, staff_id) VALUES (?, 'receive', ?, ?, ?, ?, ?, 'ยอดยกมา (ข้อมูลตัวอย่าง)', 's1')",
        [at, id, name, lotNo, d(expIn), qty],
      )
    }
  }
}
