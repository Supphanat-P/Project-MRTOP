import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { CATEGORIES } from '../data/seed.js'
import { baht, daysUntil, downloadCSV, expiredQty, stockOf, thDate, today, uid } from '../utils.js'
import { Badge, catClass, Field, Modal } from '../components/ui.jsx'

const blank = { id: '', barcode: '', name: '', generic: '', category: CATEGORIES[0], unit: 'แผง', price: 0, cost: 0, minStock: 10, dosage: '', lots: [] }

export default function Inventory() {
  const { state, dispatch, me } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState({})
  const [edit, setEdit] = useState(null)
  const [recv, setRecv] = useState(null)

  const rows = useMemo(() => state.products.filter((p) => {
    const k = q.toLowerCase()
    if (k && !(p.name.toLowerCase().includes(k) || p.generic.toLowerCase().includes(k) || p.barcode.includes(k))) return false
    if (filter === 'low') return stockOf(p) <= p.minStock
    if (filter === 'exp') return p.lots.some((l) => { const n = daysUntil(l.exp); return n >= 0 && n <= 90 })
    if (filter === 'expired') return expiredQty(p) > 0
    return true
  }), [state.products, q, filter])

  const value = state.products.reduce((s, p) => s + stockOf(p) * p.cost, 0)

  const exportCSV = () => downloadCSV(`stock-${today()}.csv`, [
    ['บาร์โค้ด', 'ชื่อยา', 'ชื่อสามัญ', 'ประเภท', 'หน่วย', 'ทุน', 'ราคาขาย', 'Lot', 'วันหมดอายุ', 'จำนวน'],
    ...state.products.flatMap((p) => (p.lots.length ? p.lots : [{ lotNo: '', exp: '', qty: 0 }]).map((l) => [p.barcode, p.name, p.generic, p.category, p.unit, p.cost, p.price, l.lotNo, l.exp, l.qty])),
  ])

  const writeOff = (p, l) => {
    const reason = prompt(`ตัดจำหน่าย/ทำลาย ${p.name} Lot ${l.lotNo} (${l.qty} ${p.unit})\nระบุเหตุผล:`, daysUntil(l.exp) < 0 ? 'ยาหมดอายุ' : '')
    if (reason === null) return
    dispatch({ type: 'WRITE_OFF', id: uid(), at: new Date().toISOString(), productId: p.id, lotNo: l.lotNo, reason, staffId: me.id })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>📦 คลังยา & สต็อก</h2>
        <div className="row gap">
          <button className="btn" onClick={exportCSV}>⬇️ ส่งออก CSV</button>
          <button className="btn" onClick={() => setRecv({ productId: state.products[0]?.id, lotNo: '', qty: 1, exp: '', cost: '', supplier: '', invoiceNo: '' })}>📥 รับยาเข้า</button>
          <button className="btn primary" onClick={() => setEdit({ ...blank })}>＋ เพิ่มสินค้า</button>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <input className="search" placeholder="ค้นหาชื่อยา / บาร์โค้ด" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips">
            {[['all', 'ทั้งหมด'], ['low', 'ใกล้หมดสต็อก'], ['exp', 'หมดอายุใน 90 วัน'], ['expired', 'หมดอายุแล้ว']].map(([k, t]) => (
              <button key={k} className={'chip ' + (filter === k ? 'active' : '')} onClick={() => setFilter(k)}>{t}</button>
            ))}
          </div>
          <span className="muted">มูลค่าคงคลัง (ทุน) <b>{baht(value)}</b></span>
        </div>
        <table className="tbl">
          <thead><tr><th></th><th>สินค้า</th><th>ประเภท</th><th className="r">ทุน</th><th className="r">ขาย</th><th className="r">คงเหลือ</th><th>ใกล้หมดอายุสุด</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const st = stockOf(p)
              const ex = expiredQty(p)
              const next = p.lots.filter((l) => daysUntil(l.exp) >= 0).sort((a, b) => a.exp.localeCompare(b.exp))[0]
              const n = next ? daysUntil(next.exp) : null
              return [
                <tr key={p.id}>
                  <td><button className="icon-btn" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>{open[p.id] ? '▾' : '▸'}</button></td>
                  <td><b>{p.name}</b><div className="muted small">{p.generic} · {p.barcode}</div></td>
                  <td><Badge cls={catClass(p.category)}>{p.category}</Badge></td>
                  <td className="r">{baht(p.cost)}</td>
                  <td className="r">{baht(p.price)}</td>
                  <td className="r"><b className={st <= p.minStock ? 'txt-danger' : ''}>{st}</b> {p.unit}{ex > 0 && <div className="txt-danger small">หมดอายุ {ex}</div>}</td>
                  <td>{next ? <span className={n <= 30 ? 'txt-danger' : n <= 90 ? 'txt-warn' : ''}>{thDate(next.exp)} ({n} วัน)</span> : '-'}</td>
                  <td className="r nowrap">
                    <button className="btn sm" onClick={() => setRecv({ productId: p.id, lotNo: '', qty: 1, exp: '', cost: p.cost, supplier: '', invoiceNo: '' })}>รับเข้า</button>
                    <button className="btn sm" onClick={() => setEdit({ ...p })}>แก้ไข</button>
                  </td>
                </tr>,
                open[p.id] && (
                  <tr key={p.id + '-lots'} className="sub-row"><td></td><td colSpan={7}>
                    {!p.lots.length ? <span className="muted">ไม่มี lot คงเหลือ</span> : (
                      <table className="tbl inner"><thead><tr><th>Lot</th><th>วันหมดอายุ</th><th className="r">จำนวน</th><th></th></tr></thead><tbody>
                        {p.lots.map((l) => {
                          const d = daysUntil(l.exp)
                          return <tr key={l.lotNo + l.exp}><td className="mono">{l.lotNo}</td><td>{thDate(l.exp)} {d < 0 ? <Badge cls="danger">หมดอายุ</Badge> : d <= 90 ? <Badge cls="warn">อีก {d} วัน</Badge> : null}</td><td className="r">{l.qty}</td>
                            <td className="r"><button className="btn sm danger-outline" onClick={() => writeOff(p, l)}>ตัดจำหน่าย/ทำลาย</button></td></tr>
                        })}
                      </tbody></table>
                    )}
                    {p.dosage && <div className="muted small mt">ฉลาก: {p.dosage}</div>}
                  </td></tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </div>

      {edit && <ProductForm initial={edit} onClose={() => setEdit(null)} onSave={(p) => { dispatch({ type: 'SAVE_PRODUCT', product: p }); setEdit(null) }}
        onDelete={edit.id ? () => { if (confirm('ลบสินค้านี้?')) { dispatch({ type: 'DELETE_PRODUCT', id: edit.id }); setEdit(null) } } : null} />}
      {recv && <ReceiveForm initial={recv} products={state.products} onClose={() => setRecv(null)}
        onSave={(r) => { dispatch({ type: 'RECEIVE', ...r, id: uid(), at: new Date().toISOString(), staffId: me.id }); setRecv(null) }} />}
    </div>
  )
}

function ProductForm({ initial, onClose, onSave, onDelete }) {
  const [p, setP] = useState(initial)
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })
  const save = () => {
    if (!p.name.trim()) return alert('กรุณาระบุชื่อสินค้า')
    onSave({ ...p, id: p.id || uid(), barcode: p.barcode || String(Date.now()).slice(-13) })
  }
  return (
    <Modal title={p.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} onClose={onClose}
      footer={<>{onDelete && <button className="btn danger-outline" onClick={onDelete}>ลบ</button>}<span className="spacer" /><button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={save}>บันทึก</button></>}>
      <div className="grid2">
        <Field label="ชื่อทางการค้า *"><input value={p.name} onChange={set('name')} /></Field>
        <Field label="ชื่อสามัญทางยา"><input value={p.generic} onChange={set('generic')} /></Field>
        <Field label="บาร์โค้ด" hint="เว้นว่างเพื่อสร้างอัตโนมัติ"><input value={p.barcode} onChange={set('barcode')} /></Field>
        <Field label="ประเภทยา"><select value={p.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="หน่วย"><input value={p.unit} onChange={set('unit')} /></Field>
        <Field label="จุดสั่งซื้อขั้นต่ำ"><input type="number" value={p.minStock} onChange={set('minStock')} /></Field>
        <Field label="ราคาทุน"><input type="number" value={p.cost} onChange={set('cost')} /></Field>
        <Field label="ราคาขาย"><input type="number" value={p.price} onChange={set('price')} /></Field>
      </div>
      <Field label="วิธีใช้ (พิมพ์บนฉลากยาอัตโนมัติ)"><textarea rows="2" value={p.dosage} onChange={set('dosage')} /></Field>
    </Modal>
  )
}

function ReceiveForm({ initial, products, onClose, onSave }) {
  const [r, setR] = useState(initial)
  const set = (k) => (e) => setR({ ...r, [k]: e.target.value })
  const scan = (e) => {
    if (e.key !== 'Enter') return
    const p = products.find((x) => x.barcode === e.target.value.trim())
    if (p) { setR({ ...r, productId: p.id, cost: p.cost }); e.target.value = '' }
  }
  const save = () => {
    if (!r.lotNo || !r.exp || !(Number(r.qty) > 0)) return alert('กรุณากรอก Lot, วันหมดอายุ และจำนวน')
    onSave({ ...r, qty: Number(r.qty), cost: Number(r.cost) || 0 })
  }
  return (
    <Modal title="📥 รับยาเข้าคลัง (บันทึก ขย.9 อัตโนมัติ)" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={save}>รับเข้า</button></>}>
      <Field label="สแกนบาร์โค้ด"><input autoFocus placeholder="สแกนแล้วกด Enter" onKeyDown={scan} /></Field>
      <Field label="สินค้า"><select value={r.productId} onChange={set('productId')}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div className="grid2">
        <Field label="เลขที่ Lot *"><input value={r.lotNo} onChange={set('lotNo')} /></Field>
        <Field label="วันหมดอายุ *"><input type="date" value={r.exp} onChange={set('exp')} /></Field>
        <Field label="จำนวน *"><input type="number" min="1" value={r.qty} onChange={set('qty')} /></Field>
        <Field label="ราคาทุน/หน่วย"><input type="number" value={r.cost} onChange={set('cost')} /></Field>
        <Field label="ผู้ขาย/บริษัท"><input value={r.supplier} onChange={set('supplier')} /></Field>
        <Field label="เลขที่ใบส่งของ/ใบกำกับ"><input value={r.invoiceNo} onChange={set('invoiceNo')} /></Field>
      </div>
    </Modal>
  )
}
