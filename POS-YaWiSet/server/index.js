import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fromDT, hashPin, HttpError, localDate, newId, pool, toDT, tx, verifyPin } from './db.js'
import { clearAll, seedDatabase } from './seed.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

const PHARMACIST_ONLY = ['ยาอันตราย', 'ยาควบคุมพิเศษ']
const ROLES = ['admin', 'pharmacist', 'cashier']
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const okId = (s) => /^[a-z0-9]{4,20}$/.test(s || '')

const sessions = new Map()
const SESSION_MS = 12 * 60 * 60 * 1000

function auth(req, _res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  const s = sessions.get(token)
  if (!s || s.exp < Date.now()) { sessions.delete(token); return next(new HttpError(401, 'กรุณาเข้าสู่ระบบใหม่')) }
  s.exp = Date.now() + SESSION_MS
  req.user = s
  req.token = token
  next()
}
const role = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'ไม่มีสิทธิ์ทำรายการนี้'))

const mapStaff = (r) => ({
  id: r.id, title: r.title, name: r.name, role: r.role, color: r.color,
  license: r.lic_no ? { no: r.lic_no, type: r.lic_type, issued: r.lic_issued, expires: r.lic_expires, university: r.lic_university, degree: r.lic_degree } : null,
})
const mapSettings = (r) => r ? ({
  shopName: r.shop_name, address: r.address, phone: r.phone, taxId: r.tax_id, licenseShop: r.license_shop, promptPay: r.prompt_pay, receiptNote: r.receipt_note,
}) : {}

async function move(c, m) {
  await c.query(
    'INSERT INTO stock_moves (at, type, product_id, name, lot_no, exp, qty, ref, note, staff_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [m.at || toDT(), m.type, m.productId, m.name, m.lotNo || null, m.exp || null, m.qty, m.ref || null, m.note || null, m.staffId || null],
  )
}

app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true })
}))

app.get('/api/public/staff', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, title, name, role, color, lic_no FROM staff WHERE active = 1 ORDER BY created_at, id')
  res.json(rows.map((r) => ({ id: r.id, title: r.title, name: r.name, role: r.role, color: r.color, licenseNo: r.lic_no })))
}))

app.post('/api/login', wrap(async (req, res) => {
  const { staffId, pin } = req.body || {}
  const [[s]] = await pool.query('SELECT * FROM staff WHERE id = ? AND active = 1', [staffId])
  if (!s || !verifyPin(pin, s.pin_hash)) throw new HttpError(401, 'PIN ไม่ถูกต้อง')
  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, { staffId: s.id, role: s.role, exp: Date.now() + SESSION_MS })
  res.json({ token, staff: mapStaff(s) })
}))

app.use('/api', auth)

app.post('/api/logout', (req, res) => { sessions.delete(req.token); res.json({ ok: true }) })

app.get('/api/bootstrap', wrap(async (_req, res) => {
  const [[settings]] = await pool.query('SELECT * FROM shop_settings WHERE id = 1')
  const [staff] = await pool.query('SELECT * FROM staff WHERE active = 1 ORDER BY created_at, id')
  const [customers] = await pool.query('SELECT id, name, phone, allergies FROM customers ORDER BY created_at, id')
  const [products] = await pool.query('SELECT * FROM products WHERE active = 1 ORDER BY name')
  const [lots] = await pool.query('SELECT product_id, lot_no, exp, qty FROM product_lots WHERE qty > 0 ORDER BY exp')
  const [receipts] = await pool.query('SELECT * FROM receipts ORDER BY at')
  const [items] = await pool.query('SELECT * FROM receipt_items ORDER BY id')
  const [itemLots] = await pool.query('SELECT * FROM receipt_item_lots ORDER BY id')
  const [moves] = await pool.query('SELECT * FROM stock_moves ORDER BY at DESC, id DESC LIMIT 1000')

  const lotsBy = {}
  for (const l of lots) (lotsBy[l.product_id] ||= []).push({ lotNo: l.lot_no, exp: l.exp, qty: l.qty })
  const ilBy = {}
  for (const l of itemLots) (ilBy[l.receipt_item_id] ||= []).push({ lotNo: l.lot_no, exp: l.exp, qty: l.qty })
  const itemsBy = {}
  for (const i of items) (itemsBy[i.receipt_id] ||= []).push({
    productId: i.product_id, name: i.name, category: i.category, unit: i.unit, price: i.price, cost: i.cost, qty: i.qty, dosage: i.dosage, lots: ilBy[i.id] || [],
  })

  res.json({
    settings: mapSettings(settings),
    staff: staff.map(mapStaff),
    customers,
    products: products.map((p) => ({
      id: p.id, barcode: p.barcode, name: p.name, generic: p.generic || '', category: p.category, unit: p.unit,
      price: p.price, cost: p.cost, minStock: p.min_stock, dosage: p.dosage || '', lots: lotsBy[p.id] || [],
    })),
    receipts: receipts.map((r) => ({
      id: r.id, no: r.no, at: fromDT(r.at), customerId: r.customer_id, staffId: r.staff_id, pharmacistId: r.pharmacist_id,
      rxNo: r.rx_no, prescriber: r.prescriber, subtotal: r.subtotal, discount: r.discount, total: r.total, payment: r.payment,
      received: r.received, change: r.change_amt, voided: !!r.voided, voidReason: r.void_reason, voidAt: fromDT(r.void_at),
      items: itemsBy[r.id] || [],
    })),
    moves: moves.map((m) => ({
      id: m.id, at: fromDT(m.at), type: m.type, productId: m.product_id, name: m.name, lotNo: m.lot_no, exp: m.exp,
      qty: m.qty, ref: m.ref, note: m.note, staffId: m.staff_id,
    })),
  })
}))

app.put('/api/settings', role('admin'), wrap(async (req, res) => {
  const s = req.body || {}
  if (!s.shopName?.trim()) throw new HttpError(400, 'กรุณาระบุชื่อร้าน')
  await pool.query(
    `INSERT INTO shop_settings (id, shop_name, address, phone, tax_id, license_shop, prompt_pay, receipt_note) VALUES (1,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE shop_name=VALUES(shop_name), address=VALUES(address), phone=VALUES(phone), tax_id=VALUES(tax_id),
       license_shop=VALUES(license_shop), prompt_pay=VALUES(prompt_pay), receipt_note=VALUES(receipt_note)`,
    [s.shopName.trim(), s.address, s.phone, s.taxId, s.licenseShop, s.promptPay, s.receiptNote],
  )
  res.json({ ok: true })
}))

app.put('/api/products/:id', role('admin', 'pharmacist'), wrap(async (req, res) => {
  const p = req.body || {}
  const id = req.params.id
  if (!okId(id)) throw new HttpError(400, 'รหัสสินค้าไม่ถูกต้อง')
  if (!p.name?.trim()) throw new HttpError(400, 'กรุณาระบุชื่อสินค้า')
  if (!p.barcode?.trim()) throw new HttpError(400, 'กรุณาระบุบาร์โค้ด')
  try {
    await pool.query(
      `INSERT INTO products (id, barcode, name, generic, category, unit, price, cost, min_stock, dosage) VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE barcode=VALUES(barcode), name=VALUES(name), generic=VALUES(generic), category=VALUES(category), unit=VALUES(unit),
         price=VALUES(price), cost=VALUES(cost), min_stock=VALUES(min_stock), dosage=VALUES(dosage), active=1`,
      [id, p.barcode.trim(), p.name.trim(), p.generic, p.category, p.unit, Number(p.price) || 0, Number(p.cost) || 0, Number(p.minStock) || 0, p.dosage],
    )
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'บาร์โค้ดนี้มีอยู่แล้ว')
    throw e
  }
  res.json({ ok: true, id })
}))

app.delete('/api/products/:id', role('admin', 'pharmacist'), wrap(async (req, res) => {
  await pool.query("UPDATE products SET active = 0, barcode = CONCAT(barcode, '#del', id) WHERE id = ? AND active = 1", [req.params.id])
  res.json({ ok: true })
}))

app.post('/api/receive', role('admin', 'pharmacist'), wrap(async (req, res) => {
  const { productId, lotNo, qty, exp, cost, supplier, invoiceNo } = req.body || {}
  const n = parseInt(qty)
  if (!lotNo?.trim() || !exp || !(n > 0)) throw new HttpError(400, 'กรุณากรอก Lot, วันหมดอายุ และจำนวน')
  await tx(async (c) => {
    const [[p]] = await c.query('SELECT * FROM products WHERE id = ? AND active = 1', [productId])
    if (!p) throw new HttpError(404, 'ไม่พบสินค้า')
    await c.query(
      'INSERT INTO product_lots (product_id, lot_no, exp, qty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)',
      [productId, lotNo.trim(), exp, n],
    )
    if (Number(cost) > 0) await c.query('UPDATE products SET cost = ? WHERE id = ?', [Number(cost), productId])
    await move(c, { type: 'receive', productId, name: p.name, lotNo: lotNo.trim(), exp, qty: n, ref: invoiceNo, note: supplier ? 'จาก ' + supplier : null, staffId: req.user.staffId })
  })
  res.json({ ok: true })
}))

app.post('/api/write-off', role('admin', 'pharmacist'), wrap(async (req, res) => {
  const { productId, lotNo, exp, reason } = req.body || {}
  await tx(async (c) => {
    const [[p]] = await c.query('SELECT * FROM products WHERE id = ?', [productId])
    const [[l]] = await c.query('SELECT * FROM product_lots WHERE product_id = ? AND lot_no = ? AND exp = ? FOR UPDATE', [productId, lotNo, exp])
    if (!p || !l?.qty) throw new HttpError(404, 'ไม่พบ Lot นี้')
    await c.query('DELETE FROM product_lots WHERE id = ?', [l.id])
    await move(c, { type: 'write_off', productId, name: p.name, lotNo, exp, qty: -l.qty, note: reason || null, staffId: req.user.staffId })
  })
  res.json({ ok: true })
}))

app.post('/api/adjust', role('admin', 'pharmacist'), wrap(async (req, res) => {
  const { productId, lotNo, exp, count, reason } = req.body || {}
  const n = parseInt(count)
  if (!(n >= 0)) throw new HttpError(400, 'จำนวนที่นับได้ไม่ถูกต้อง')
  await tx(async (c) => {
    const [[p]] = await c.query('SELECT * FROM products WHERE id = ?', [productId])
    const [[l]] = await c.query('SELECT * FROM product_lots WHERE product_id = ? AND lot_no = ? AND exp = ? FOR UPDATE', [productId, lotNo, exp])
    if (!p || !l) throw new HttpError(404, 'ไม่พบ Lot นี้')
    const diff = n - l.qty
    if (!diff) return
    if (n === 0) await c.query('DELETE FROM product_lots WHERE id = ?', [l.id])
    else await c.query('UPDATE product_lots SET qty = ? WHERE id = ?', [n, l.id])
    await move(c, { type: 'adjust', productId, name: p.name, lotNo, exp, qty: diff, note: reason || 'ตรวจนับสต็อก', staffId: req.user.staffId })
  })
  res.json({ ok: true })
}))

app.post('/api/checkout', wrap(async (req, res) => {
  const { cart = [], receipt: r = {} } = req.body || {}
  if (!cart.length) throw new HttpError(400, 'ยังไม่มีสินค้าในตะกร้า')
  const today = localDate()

  const result = await tx(async (c) => {
    const lines = []
    for (const line of cart) {
      const qty = parseInt(line.qty)
      if (!(qty > 0)) throw new HttpError(400, 'จำนวนไม่ถูกต้อง')
      const [[p]] = await c.query('SELECT * FROM products WHERE id = ? AND active = 1', [line.productId])
      if (!p) throw new HttpError(404, 'ไม่พบสินค้า')
      lines.push({ p, qty })
    }
    const needPharm = lines.some((l) => PHARMACIST_ONLY.includes(l.p.category))
    const needRx = lines.some((l) => l.p.category === 'ยาควบคุมพิเศษ')

    const pharmacistId = r.pharmacistId || null
    if (needPharm && !pharmacistId) throw new HttpError(400, 'มียาอันตราย/ยาควบคุมพิเศษ ต้องระบุเภสัชกรผู้จ่ายยา')
    if (pharmacistId) {
      const [[ph]] = await c.query('SELECT * FROM staff WHERE id = ? AND active = 1', [pharmacistId])
      if (!ph?.lic_no) throw new HttpError(400, 'ผู้จ่ายยาไม่มีใบประกอบวิชาชีพ')
      if (ph.lic_expires && ph.lic_expires < today) throw new HttpError(400, `ใบอนุญาตของ ${ph.title}${ph.name} หมดอายุแล้ว`)
    }
    const rxNo = r.rxNo?.trim() || null
    const prescriber = r.prescriber?.trim() || null
    if (needRx && (!rxNo || !prescriber)) throw new HttpError(400, 'ยาควบคุมพิเศษต้องระบุเลขใบสั่งยาและชื่อแพทย์')

    const subtotal = +lines.reduce((s, l) => s + l.p.price * l.qty, 0).toFixed(2)
    const discount = Math.min(Math.max(Number(r.discount) || 0, 0), subtotal)
    const total = +(subtotal - discount).toFixed(2)
    const payment = ['cash', 'qr', 'card'].includes(r.payment) ? r.payment : 'cash'
    const received = payment === 'cash' ? Number(r.received) || 0 : total
    if (received < total) throw new HttpError(400, 'รับเงินไม่พอ')

    const at = toDT()
    const day = today.slice(2).replace(/-/g, '')
    const [[last]] = await c.query('SELECT no FROM receipts WHERE no LIKE ? ORDER BY no DESC LIMIT 1 FOR UPDATE', [`R${day}-%`])
    const no = `R${day}-${String((last ? parseInt(last.no.split('-')[1]) : 0) + 1).padStart(4, '0')}`
    const receiptId = newId()
    const [[cust]] = await c.query('SELECT id FROM customers WHERE id = ?', [r.customerId || ''])

    await c.query(
      `INSERT INTO receipts (id, no, at, customer_id, staff_id, pharmacist_id, rx_no, prescriber, subtotal, discount, total, payment, received, change_amt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [receiptId, no, at, cust?.id || null, req.user.staffId, pharmacistId, rxNo, prescriber, subtotal, discount, total, payment, received, +(received - total).toFixed(2)],
    )

    for (const { p, qty } of lines) {
      const [lots] = await c.query(
        'SELECT id, lot_no, exp, qty FROM product_lots WHERE product_id = ? AND exp >= ? AND qty > 0 ORDER BY exp FOR UPDATE',
        [p.id, today],
      )
      const avail = lots.reduce((s, l) => s + l.qty, 0)
      if (avail < qty) throw new HttpError(409, `${p.name} สต็อกไม่พอ (เหลือ ${avail} ${p.unit})`)

      const [ins] = await c.query(
        'INSERT INTO receipt_items (receipt_id, product_id, name, category, unit, price, cost, qty, dosage) VALUES (?,?,?,?,?,?,?,?,?)',
        [receiptId, p.id, p.name, p.category, p.unit, p.price, p.cost, qty, p.dosage],
      )
      let need = qty
      for (const l of lots) {
        if (need <= 0) break
        const take = Math.min(l.qty, need)
        need -= take
        if (take === l.qty) await c.query('DELETE FROM product_lots WHERE id = ?', [l.id])
        else await c.query('UPDATE product_lots SET qty = qty - ? WHERE id = ?', [take, l.id])
        await c.query('INSERT INTO receipt_item_lots (receipt_item_id, lot_no, exp, qty) VALUES (?,?,?,?)', [ins.insertId, l.lot_no, l.exp, take])
        await move(c, { at, type: 'sale', productId: p.id, name: p.name, lotNo: l.lot_no, exp: l.exp, qty: -take, ref: no, staffId: req.user.staffId })
      }
    }
    return { id: receiptId, no }
  })
  res.json(result)
}))

app.post('/api/receipts/:id/void', role('admin', 'pharmacist'), wrap(async (req, res) => {
  const reason = req.body?.reason?.trim()
  if (!reason) throw new HttpError(400, 'กรุณาระบุเหตุผล')
  await tx(async (c) => {
    const [[r]] = await c.query('SELECT * FROM receipts WHERE id = ? FOR UPDATE', [req.params.id])
    if (!r) throw new HttpError(404, 'ไม่พบใบเสร็จ')
    if (r.voided) throw new HttpError(409, 'บิลนี้ถูกยกเลิกแล้ว')
    const [items] = await c.query('SELECT * FROM receipt_items WHERE receipt_id = ?', [r.id])
    const at = toDT()
    for (const it of items) {
      const [ls] = await c.query('SELECT * FROM receipt_item_lots WHERE receipt_item_id = ?', [it.id])
      for (const l of ls) {
        await c.query(
          'INSERT INTO product_lots (product_id, lot_no, exp, qty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)',
          [it.product_id, l.lot_no, l.exp, l.qty],
        )
        await move(c, { at, type: 'void', productId: it.product_id, name: it.name, lotNo: l.lot_no, exp: l.exp, qty: l.qty, ref: r.no, note: reason, staffId: req.user.staffId })
      }
    }
    await c.query('UPDATE receipts SET voided = 1, void_reason = ?, void_at = ? WHERE id = ?', [reason, at, r.id])
  })
  res.json({ ok: true })
}))

app.put('/api/staff/:id', role('admin'), wrap(async (req, res) => {
  const s = req.body || {}
  const id = req.params.id
  if (!okId(id)) throw new HttpError(400, 'รหัสพนักงานไม่ถูกต้อง')
  if (!s.name?.trim()) throw new HttpError(400, 'กรุณาระบุชื่อ')
  if (!ROLES.includes(s.role)) throw new HttpError(400, 'บทบาทไม่ถูกต้อง')
  if (s.pin && !/^\d{4}$/.test(s.pin)) throw new HttpError(400, 'PIN ต้องเป็นตัวเลข 4 หลัก')
  const l = s.role !== 'cashier' ? s.license : null
  if (s.role !== 'cashier' && (!l?.no?.trim() || !l?.expires)) throw new HttpError(400, 'เภสัชกรต้องมีเลขที่ใบอนุญาตและวันหมดอายุ')
  if (id === req.user.staffId && s.role !== 'admin') throw new HttpError(400, 'เปลี่ยนบทบาทของตัวเองไม่ได้')
  const [[exist]] = await pool.query('SELECT id FROM staff WHERE id = ?', [id])
  if (!exist && !s.pin) throw new HttpError(400, 'พนักงานใหม่ต้องตั้ง PIN')
  const lic = [l?.no?.trim() || null, l?.type || null, l?.issued || null, l?.expires || null, l?.university || null, l?.degree || null]
  try {
    if (exist) {
      await pool.query(
        `UPDATE staff SET title=?, name=?, role=?, color=?, lic_no=?, lic_type=?, lic_issued=?, lic_expires=?, lic_university=?, lic_degree=?, active=1
         ${s.pin ? ', pin_hash=?' : ''} WHERE id=?`,
        [s.title, s.name.trim(), s.role, s.color, ...lic, ...(s.pin ? [hashPin(s.pin)] : []), id],
      )
    } else {
      await pool.query(
        `INSERT INTO staff (id, title, name, role, pin_hash, color, lic_no, lic_type, lic_issued, lic_expires, lic_university, lic_degree)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, s.title, s.name.trim(), s.role, hashPin(s.pin), s.color, ...lic],
      )
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'เลขที่ใบอนุญาตนี้มีในระบบแล้ว')
    throw e
  }
  for (const ss of sessions.values()) if (ss.staffId === id) ss.role = s.role
  res.json({ ok: true, id })
}))

app.delete('/api/staff/:id', role('admin'), wrap(async (req, res) => {
  if (req.params.id === req.user.staffId) throw new HttpError(400, 'ลบบัญชีตัวเองไม่ได้')
  await pool.query('UPDATE staff SET active = 0, lic_no = NULL WHERE id = ?', [req.params.id])
  for (const [t, s] of sessions) if (s.staffId === req.params.id) sessions.delete(t)
  res.json({ ok: true })
}))

app.post('/api/customers', wrap(async (req, res) => {
  const c = req.body || {}
  if (!c.name?.trim()) throw new HttpError(400, 'กรุณาระบุชื่อลูกค้า')
  const id = okId(c.id) ? c.id : newId()
  await pool.query(
    'INSERT INTO customers (id, name, phone, allergies) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), allergies=VALUES(allergies)',
    [id, c.name.trim(), c.phone || null, c.allergies || null],
  )
  res.json({ ok: true, id })
}))

app.post('/api/admin/reset', role('admin'), wrap(async (_req, res) => {
  await tx(async (c) => { await clearAll(c); await seedDatabase(c) })
  sessions.clear()
  res.json({ ok: true })
}))

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'ไม่พบ API นี้')))

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile('index.html', { root: dist }))
}

const DB_ERRORS = {
  ECONNREFUSED: 'เชื่อมต่อ MySQL ไม่ได้ - ตรวจสอบว่า MySQL Server เปิดอยู่',
  ER_ACCESS_DENIED_ERROR: 'MySQL ปฏิเสธการเข้าสู่ระบบ - ตรวจสอบ DB_USER/DB_PASSWORD ในไฟล์ .env',
  ER_BAD_DB_ERROR: 'ยังไม่มีฐานข้อมูล - รัน npm run db:init',
  ER_NO_SUCH_TABLE: 'ยังไม่มีตาราง - รัน npm run db:init',
}
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500)
  if (status === 500) console.error(err)
  const msg = status === 500 ? DB_ERRORS[err.code] || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' : err.message
  res.status(status).json({ error: msg })
})

const PORT = Number(process.env.PORT || 3001)
app.listen(PORT, async () => {
  console.log(`ยาวิเศษ API: http://localhost:${PORT}`)
  try { await pool.query('SELECT 1'); console.log('เชื่อมต่อ MySQL สำเร็จ') }
  catch (e) { console.error('เชื่อมต่อ MySQL ไม่ได้:', e.message, '\n  ตรวจสอบไฟล์ .env แล้วรัน npm run db:init') }
})
