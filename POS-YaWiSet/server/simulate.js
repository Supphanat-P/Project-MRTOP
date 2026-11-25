import { addMonths, allergyHits, DB_NAME, isSellable, localDate, newId, pool, toDT, tx } from './db.js'

const DAYS = Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1]) || 30
const DRUG_CATEGORIES = ['ยาสามัญประจำบ้าน', 'ยาอันตราย', 'ยาควบคุมพิเศษ', 'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย']
const DOCTORS = ['นพ.สมศักดิ์ รักดี', 'พญ.กมลวรรณ ใจงาม', 'นพ.ธนกร วงศ์ไทย', 'พญ.ปิยะนุช สายสุข']

let seed = 20261126
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a, b) => a + Math.floor(rand() * (b - a + 1))
const pickW = (items, weight) => {
  const total = items.reduce((s, x) => s + weight(x), 0)
  let r = rand() * total
  for (const x of items) if ((r -= weight(x)) <= 0) return x
  return items.at(-1)
}
const at = (day, h, m) => toDT(new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString())
const parse = (s) => { try { return JSON.parse(s || '[]') } catch { return [] } }

async function move(c, m) {
  await c.query(
    'INSERT INTO stock_moves (at, type, product_id, name, lot_no, exp, qty, balance, ref, note, detail, staff_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [m.at, m.type, m.productId, m.name, m.lotNo, m.exp, m.qty, m.balance, m.ref || null, m.note || null, m.detail || null, m.staffId],
  )
}

async function rebalance(c) {
  const [moves] = await c.query('SELECT id, product_id, lot_no, exp, qty, balance FROM stock_moves WHERE lot_no IS NOT NULL AND exp IS NOT NULL ORDER BY at, id')
  const [rows] = await c.query('SELECT product_id, lot_no, exp, qty FROM product_lots')
  const now = new Map(rows.map((l) => [`${l.product_id}|${l.lot_no}|${l.exp}`, l.qty]))
  const groups = new Map()
  for (const m of moves) {
    const k = `${m.product_id}|${m.lot_no}|${m.exp}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(m)
  }
  let fixed = 0
  for (const [k, list] of groups) {
    if (list.reduce((s, m) => s + m.qty, 0) !== (now.get(k) ?? 0)) continue
    let run = 0
    for (const m of list) {
      run += m.qty
      if (m.balance !== run) {
        await c.query('UPDATE stock_moves SET balance = ? WHERE id = ?', [run, m.id])
        fixed++
      }
    }
  }
  return fixed
}

if (process.argv.includes('--rebalance')) {
  const fixed = await tx(rebalance)
  console.log(`คำนวณยอดคงเหลือในประวัติสต็อกใหม่ ${fixed} รายการ`)
  await pool.end()
  process.exit(0)
}

const start = localDate(-DAYS)
const [products] = await pool.query('SELECT * FROM products WHERE active = 1')
const [staff] = await pool.query('SELECT * FROM staff WHERE active = 1 AND lic_no IS NOT NULL AND (lic_expires IS NULL OR lic_expires >= ?)', [localDate()])
const [members] = await pool.query('SELECT id, name, allergens FROM customers WHERE member_no IS NOT NULL')
const [[walkIn]] = await pool.query("SELECT id FROM customers WHERE id = 'c1'")
if (!products.length || !staff.length) {
  console.error('ต้องมีสินค้าและเภสัชกรที่มีใบอนุญาตอย่างน้อย 1 คนก่อน (รัน npm run db:init)')
  process.exit(1)
}
for (const m of members) m.allergens = parse(m.allergens)

const stats = { receipts: 0, items: 0, total: 0, received: 0, writeOffs: 0 }

await tx(async (c) => {
  const lots = {}
  for (const p of products) {
    const [rows] = await c.query('SELECT * FROM product_lots WHERE product_id = ? AND qty > 0 ORDER BY exp', [p.id])
    lots[p.id] = rows
  }

  const tag = start.slice(2, 7).replace('-', '')
  for (const p of products) {
    const qty = p.category === 'ยาควบคุมพิเศษ' ? 80 : p.price >= 200 ? 40 : 160
    const exp = addMonths(start, int(18, 30))
    const lotNo = `SIM${tag}-${p.id.toUpperCase()}`
    const [ins] = await c.query(
      'INSERT INTO product_lots (product_id, lot_no, exp, qty, received_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)',
      [p.id, lotNo, exp, qty, at(start, 8, 30)],
    )
    const [[row]] = await c.query('SELECT * FROM product_lots WHERE product_id = ? AND lot_no = ? AND exp = ?', [p.id, lotNo, exp])
    if (ins.affectedRows === 1) lots[p.id].push(row)
    else Object.assign(lots[p.id].find((l) => l.id === row.id) || {}, row)
    lots[p.id].sort((a, b) => (a.exp < b.exp ? -1 : 1))
    await move(c, { at: at(start, 8, 30), type: 'receive', productId: p.id, name: p.name, lotNo, exp, qty, balance: row.qty, ref: `INV-${tag}-${p.id}`, note: 'รับยาเข้า (ข้อมูลจำลอง)', staffId: staff[0].id })
    stats.received += qty
  }

  for (let ago = DAYS - 1; ago >= 1; ago--) {
    const day = localDate(-ago)
    const weekend = [0, 6].includes(new Date(day + 'T00:00:00').getDay())
    const bills = int(weekend ? 9 : 5, weekend ? 15 : 11)
    const times = Array.from({ length: bills }, () => [int(9, 20), int(0, 59)]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const [[last]] = await c.query('SELECT no FROM receipts WHERE no LIKE ? ORDER BY no DESC LIMIT 1', [`R${day.slice(2).replace(/-/g, '')}-%`])
    let seq = last ? parseInt(last.no.split('-')[1]) : 0

    for (const [h, mi] of times) {
      const when = at(day, h, mi)
      const ph = staff[int(0, staff.length - 1)]
      const member = rand() < 0.35 && members.length ? members[int(0, members.length - 1)] : null
      const usable = (l) => l.qty > 0 && isSellable(l.exp, day) && String(l.received_at) <= when
      const available = (p) => lots[p.id].filter(usable).reduce((s, l) => s + l.qty, 0)
      const lines = []
      for (let n = int(1, 3); n > 0; n--) {
        const p = pickW(products, (x) => (x.category === 'ยาสามัญประจำบ้าน' ? 5 : x.category === 'ยาควบคุมพิเศษ' ? 0.3 : 2))
        if (lines.some((l) => l.p.id === p.id)) continue
        if (member && allergyHits(p, member.allergens).length) continue
        const qty = Math.min(int(1, p.price >= 200 ? 1 : 3), available(p))
        if (qty > 0) lines.push({ p, qty })
      }
      if (!lines.length) continue

      const subtotal = +lines.reduce((s, l) => s + l.p.price * l.qty, 0).toFixed(2)
      const discount = member && subtotal >= 300 && rand() < 0.4 ? 10 : 0
      const total = +(subtotal - discount).toFixed(2)
      const payment = pickW(['cash', 'qr', 'card'], (x) => ({ cash: 6, qr: 4, card: 1 })[x])
      const received = payment === 'cash' ? Math.ceil(total / 100) * 100 : total
      const no = `R${day.slice(2).replace(/-/g, '')}-${String(++seq).padStart(4, '0')}`
      const receiptId = newId()
      const hasDrug = lines.some((l) => DRUG_CATEGORIES.includes(l.p.category))
      await c.query(
        `INSERT INTO receipts (id, no, at, customer_id, staff_id, pharmacist_id, subtotal, discount, total, payment, received, change_amt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [receiptId, no, when, member?.id || walkIn?.id || null, ph.id, hasDrug ? ph.id : null, subtotal, discount, total, payment, received, +(received - total).toFixed(2)],
      )
      for (const { p, qty } of lines) {
        const isRx = p.category === 'ยาควบคุมพิเศษ'
        const [ins] = await c.query(
          'INSERT INTO receipt_items (receipt_id, product_id, name, category, unit, price, cost, qty, dosage, rx_no, prescriber) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [receiptId, p.id, p.name, p.category, p.unit, p.price, p.cost, qty, p.dosage, isRx ? `RX-${day.replace(/-/g, '')}-${int(100, 999)}` : null, isRx ? DOCTORS[int(0, DOCTORS.length - 1)] : null],
        )
        let need = qty
        for (const l of lots[p.id]) {
          if (need <= 0) break
          if (!usable(l)) continue
          const take = Math.min(l.qty, need)
          need -= take
          l.qty -= take
          if (l.qty === 0) await c.query('DELETE FROM product_lots WHERE id = ?', [l.id])
          else await c.query('UPDATE product_lots SET qty = ? WHERE id = ?', [l.qty, l.id])
          await c.query('INSERT INTO receipt_item_lots (receipt_item_id, lot_no, exp, qty) VALUES (?,?,?,?)', [ins.insertId, l.lot_no, l.exp, take])
          await move(c, { at: when, type: 'sale', productId: p.id, name: p.name, lotNo: l.lot_no, exp: l.exp, qty: -take, balance: l.qty, ref: no, staffId: ph.id })
        }
        stats.items += qty
      }
      stats.receipts++
      stats.total += total
    }

    if (ago % 9 === 4) {
      const p = products[int(0, products.length - 1)]
      const l = lots[p.id].find((x) => x.qty > 3 && String(x.received_at) <= at(day, 21, 0))
      if (l) {
        const qty = int(1, 2)
        l.qty -= qty
        await c.query('UPDATE product_lots SET qty = ? WHERE id = ?', [l.qty, l.id])
        await move(c, { at: at(day, 21, 0), type: 'write_off', productId: p.id, name: p.name, lotNo: l.lot_no, exp: l.exp, qty: -qty, balance: l.qty, ref: `DS-${day.replace(/-/g, '')}`, note: 'ชำรุด / เสียหาย', detail: 'บรรจุภัณฑ์เสียหายระหว่างจัดเรียงสินค้า (ข้อมูลจำลอง)', staffId: staff[0].id })
        stats.writeOffs++
      }
    }
  }
  stats.rebalanced = await rebalance(c)
})

console.log(`จำลองข้อมูลการขาย ${DAYS} วันย้อนหลังในฐานข้อมูล "${DB_NAME}" แล้ว`)
console.log(`  รับยาเข้า ${stats.received} หน่วย · ใบเสร็จ ${stats.receipts} ใบ · ขาย ${stats.items} หน่วย · ยอดขาย ${stats.total.toLocaleString('th-TH')} บาท · ตัดสต็อก ${stats.writeOffs} ครั้ง`)
await pool.end()
