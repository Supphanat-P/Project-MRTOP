import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, CATEGORIES, daysUntil, downloadCSV, expiredQty, expStatus, MOVE_LABEL, nextExp, num, stockOf, thDate, today, uid, UNITS } from '../utils.js'
import { Badge, CatTag, Field, Modal, PageHead, Stat } from '../components/ui.jsx'

const blank = { id: '', barcode: '', name: '', generic: '', category: CATEGORIES[0], unit: 'แผง', price: '', cost: '', minStock: 10, dosage: '', lots: [] }

export default function Inventory() {
  const { state, act, me } = useStore()
  const canEdit = me.role !== 'cashier'
  const [tab, setTab] = useState('stock')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState({})
  const [edit, setEdit] = useState(null)
  const [recv, setRecv] = useState(null)
  const [lotAct, setLotAct] = useState(null)

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return state.products.filter((p) => {
      if (k && !(p.name.toLowerCase().includes(k) || p.generic.toLowerCase().includes(k) || p.barcode.includes(k))) return false
      if (filter === 'low') return stockOf(p) <= p.minStock
      if (filter === 'soon') return p.lots.some((l) => { const n = daysUntil(l.exp); return n >= 0 && n <= 90 })
      if (filter === 'expired') return expiredQty(p) > 0
      return true
    })
  }, [state.products, q, filter])

  const totals = useMemo(() => ({
    value: state.products.reduce((s, p) => s + stockOf(p) * p.cost, 0),
    low: state.products.filter((p) => stockOf(p) <= p.minStock).length,
    soon: state.products.filter((p) => p.lots.some((l) => { const n = daysUntil(l.exp); return n >= 0 && n <= 90 })).length,
    expired: state.products.filter((p) => expiredQty(p) > 0).length,
  }), [state.products])

  const exportCSV = () => downloadCSV(`stock-${today()}.csv`, [
    ['บาร์โค้ด', 'ชื่อ', 'ชื่อสามัญ', 'ประเภท', 'หน่วย', 'Lot', 'วันหมดอายุ', 'คงเหลือ', 'ทุน', 'ราคาขาย'],
    ...state.products.flatMap((p) => (p.lots.length ? p.lots : [{ lotNo: '-', exp: '', qty: 0 }]).map((l) => [p.barcode, p.name, p.generic, p.category, p.unit, l.lotNo, l.exp, l.qty, p.cost, p.price])),
  ])

  return (
    <div className="page">
      <PageHead label="Inventory" title="คลังยา &" em="สต็อก" sub="จัดการสินค้า รับยาเข้า ตรวจนับ และติดตามวันหมดอายุแยกตาม Lot">
        <button className="btn" onClick={exportCSV}>⬇ CSV</button>
        {canEdit && <button className="btn" onClick={() => setRecv({ productId: state.products[0]?.id || '', lotNo: '', exp: today(365), qty: '', cost: '', supplier: '', invoiceNo: '' })}>＋ รับยาเข้า</button>}
        {canEdit && <button className="btn primary" onClick={() => setEdit({ ...blank })}>＋ เพิ่มสินค้า</button>}
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="มูลค่าสต็อก (ทุน)" value={baht(totals.value)} change={`${state.products.length} รายการ`} />
        <Stat label="ต่ำกว่าขั้นต่ำ" value={num(totals.low)} change="ควรสั่งซื้อเพิ่ม" />
        <Stat label="ใกล้หมดอายุ (≤ 90 วัน)" value={num(totals.soon)} change="ควรขายก่อน" />
        <Stat label="มี Lot หมดอายุ" value={num(totals.expired)} change="ควรตัดจำหน่าย" />
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <div className="seg">
          <button className={tab === 'stock' ? 'on' : ''} onClick={() => setTab('stock')}>สินค้า & Lot</button>
          <button className={tab === 'moves' ? 'on' : ''} onClick={() => setTab('moves')}>ความเคลื่อนไหวสต็อก</button>
        </div>
      </div>

      {tab === 'stock' ? (
        <div className="card flush">
          <div className="row" style={{ padding: 16 }}>
            <div className="search"><input placeholder="ค้นหาชื่อ / ชื่อสามัญ / บาร์โค้ด" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="seg">
              {[['all', 'ทั้งหมด'], ['low', 'ใกล้หมด'], ['soon', 'ใกล้หมดอายุ'], ['expired', 'หมดอายุ']].map(([k, v]) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>สินค้า</th><th>ประเภท</th><th className="right">ราคา / ทุน</th><th className="right">คงเหลือ</th><th>หมดอายุถัดไป</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const st = stockOf(p)
                  const ne = nextExp(p)
                  return (
                    <Fragment key={p.id}>
                      <tr>
                        <td><b>{p.name}</b><br /><small className="muted">{p.generic} · <span className="mono">{p.barcode}</span></small></td>
                        <td><CatTag category={p.category} /></td>
                        <td className="right nowrap">{baht(p.price)}<br /><small className="muted">ทุน {baht(p.cost)}</small></td>
                        <td className="right nowrap"><Badge cls={!st ? 'danger' : st <= p.minStock ? 'warn' : 'ok'}>{st} {p.unit}</Badge>
                          {expiredQty(p) > 0 && <><br /><small style={{ color: 'var(--danger)' }}>หมดอายุ {expiredQty(p)}</small></>}</td>
                        <td>{ne ? <Badge cls={expStatus(ne).cls}>{expStatus(ne).label}</Badge> : <span className="muted">-</span>}</td>
                        <td className="right nowrap">
                          <button className="btn sm ghost" onClick={() => setOpen({ ...open, [p.id]: !open[p.id] })}>{open[p.id] ? 'ซ่อน' : `Lot (${p.lots.length})`}</button>
                          {canEdit && <button className="btn sm" onClick={() => setEdit({ ...p })}>แก้ไข</button>}
                        </td>
                      </tr>
                      {open[p.id] && (p.lots.length ? p.lots.map((l) => (
                        <tr className="sub" key={l.lotNo + l.exp}>
                          <td colSpan={2}>&nbsp;&nbsp;↳ Lot <b className="mono">{l.lotNo}</b></td>
                          <td className="right">{thDate(l.exp)}</td>
                          <td className="right">{l.qty} {p.unit}</td>
                          <td><Badge cls={expStatus(l.exp).cls}>{daysUntil(l.exp) < 0 ? 'หมดอายุ' : `อีก ${daysUntil(l.exp)} วัน`}</Badge></td>
                          <td className="right nowrap">{canEdit && <>
                            <button className="btn sm" onClick={() => setLotAct({ kind: 'adjust', p, l, count: l.qty, reason: 'ตรวจนับสต็อก' })}>ตรวจนับ</button>
                            <button className="btn sm danger" onClick={() => setLotAct({ kind: 'writeOff', p, l, reason: daysUntil(l.exp) < 0 ? 'ยาหมดอายุ' : '' })}>ตัดจำหน่าย</button>
                          </>}</td>
                        </tr>
                      )) : <tr className="sub"><td colSpan={6} className="muted">&nbsp;&nbsp;ยังไม่มีสต็อก</td></tr>)}
                    </Fragment>
                  )
                })}
                {!rows.length && <tr><td colSpan={6} className="empty">ไม่พบสินค้า</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : <Moves />}

      {edit && <ProductForm initial={edit} onClose={() => setEdit(null)}
        onSave={async (p) => { if (await act('saveProduct', p, 'บันทึกสินค้าแล้ว')) setEdit(null) }}
        onDelete={edit.id ? async () => { if (confirm(`ลบ "${edit.name}" ออกจากรายการขาย?\n(ประวัติการขายยังคงอยู่)`) && await act('deleteProduct', edit.id, 'ลบสินค้าแล้ว')) setEdit(null) } : null} />}
      {recv && <ReceiveForm initial={recv} products={state.products} onClose={() => setRecv(null)}
        onSave={async (r) => { if (await act('receive', r, 'รับยาเข้าสต็อกแล้ว')) setRecv(null) }} />}
      {lotAct && <LotAction a={lotAct} onClose={() => setLotAct(null)} onSave={async (a) => {
        const body = { productId: a.p.id, lotNo: a.l.lotNo, exp: a.l.exp, reason: a.reason, count: a.count }
        if (await act(a.kind, body, a.kind === 'adjust' ? 'ปรับยอดแล้ว' : 'ตัดจำหน่ายแล้ว')) setLotAct(null)
      }} />}
    </div>
  )
}

function Moves() {
  const { state } = useStore()
  const [type, setType] = useState('')
  const staff = (id) => state.staff.find((s) => s.id === id)?.name || '-'
  const rows = state.moves.filter((m) => !type || m.type === type)
  return (
    <div className="card flush">
      <div className="row" style={{ padding: 16 }}>
        <div className="seg">
          <button className={!type ? 'on' : ''} onClick={() => setType('')}>ทั้งหมด</button>
          {Object.entries(MOVE_LABEL).map(([k, v]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{v}</button>)}
        </div>
        <span className="spacer" /><small className="muted">แสดงล่าสุด {state.moves.length} รายการ</small>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>เวลา</th><th>ประเภท</th><th>สินค้า</th><th>Lot</th><th className="right">จำนวน</th><th>อ้างอิง / หมายเหตุ</th><th>ผู้ทำรายการ</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{thDate(m.at, true)}</td>
                <td><Badge cls={{ receive: 'ok', sale: 'muted', write_off: 'danger', void: 'violet', adjust: 'warn' }[m.type]}>{MOVE_LABEL[m.type]}</Badge></td>
                <td>{m.name}</td>
                <td className="mono">{m.lotNo}</td>
                <td className="right" style={{ fontWeight: 700, color: m.qty > 0 ? 'var(--accent)' : 'var(--danger)' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td><small>{[m.ref, m.note].filter(Boolean).join(' · ') || '-'}</small></td>
                <td>{staff(m.staffId)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="empty">ยังไม่มีรายการ</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductForm({ initial, onClose, onSave, onDelete }) {
  const [p, setP] = useState(initial)
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })
  const save = () => {
    if (!p.name.trim()) return alert('กรุณาระบุชื่อสินค้า')
    onSave({ ...p, id: p.id || uid(), barcode: p.barcode.trim() || '885' + String(Date.now()).slice(-10) })
  }
  const margin = Number(p.price) && Number(p.cost) ? Math.round(((p.price - p.cost) / p.price) * 100) : null
  return (
    <Modal title={p.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} onClose={onClose}
      footer={<>{onDelete && <button className="btn danger left" onClick={onDelete}>ลบสินค้า</button>}<button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={save}>บันทึก</button></>}>
      <div className="form-grid">
        <Field label="ชื่อการค้า *" className="span2"><input value={p.name} onChange={set('name')} autoFocus /></Field>
        <Field label="ชื่อสามัญทางยา (Generic)"><input value={p.generic} onChange={set('generic')} /></Field>
        <Field label="บาร์โค้ด" hint="เว้นว่างเพื่อสร้างอัตโนมัติ"><input value={p.barcode} onChange={set('barcode')} /></Field>
        <Field label="ประเภท"><select value={p.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="หน่วยขาย"><select value={p.unit} onChange={set('unit')}>{[...new Set([p.unit, ...UNITS])].map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="ราคาขาย (บาท)"><input inputMode="decimal" value={p.price} onChange={set('price')} /></Field>
        <Field label="ราคาทุน (บาท)" hint={margin !== null ? `กำไรขั้นต้น ${margin}%` : ''}><input inputMode="decimal" value={p.cost} onChange={set('cost')} /></Field>
        <Field label="สต็อกขั้นต่ำ (แจ้งเตือน)"><input inputMode="numeric" value={p.minStock} onChange={set('minStock')} /></Field>
        <Field label="วิธีใช้ (พิมพ์บนฉลากยา)" className="span2"><textarea value={p.dosage} onChange={set('dosage')} /></Field>
      </div>
    </Modal>
  )
}

function ReceiveForm({ initial, products, onClose, onSave }) {
  const [r, setR] = useState(initial)
  const set = (k) => (e) => setR({ ...r, [k]: e.target.value })
  const p = products.find((x) => x.id === r.productId)
  return (
    <Modal title="รับยาเข้าสต็อก" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={() => onSave(r)}>บันทึกรับเข้า</button></>}>
      <div className="form-grid">
        <Field label="สินค้า *" className="span2"><select value={r.productId} onChange={set('productId')}>{products.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}</select></Field>
        <Field label="เลขที่ Lot *"><input value={r.lotNo} onChange={set('lotNo')} autoFocus /></Field>
        <Field label="วันหมดอายุ *"><input type="date" value={r.exp} onChange={set('exp')} /></Field>
        <Field label={`จำนวน (${p?.unit || ''}) *`}><input inputMode="numeric" value={r.qty} onChange={set('qty')} /></Field>
        <Field label="ทุนต่อหน่วย (บาท)" hint={p ? `ทุนเดิม ${baht(p.cost)}` : ''}><input inputMode="decimal" value={r.cost} onChange={set('cost')} /></Field>
        <Field label="ผู้จำหน่าย"><input value={r.supplier} onChange={set('supplier')} /></Field>
        <Field label="เลขที่ใบส่งของ / ใบกำกับ"><input value={r.invoiceNo} onChange={set('invoiceNo')} /></Field>
      </div>
      {r.exp && daysUntil(r.exp) < 180 && <div className="alert warn" style={{ marginTop: 14 }}>วันหมดอายุเหลือน้อยกว่า 6 เดือน</div>}
    </Modal>
  )
}

function LotAction({ a: initial, onClose, onSave }) {
  const [a, setA] = useState(initial)
  const adjust = a.kind === 'adjust'
  return (
    <Modal title={adjust ? 'ตรวจนับ / ปรับยอด Lot' : 'ตัดจำหน่าย / ทำลาย Lot'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>ยกเลิก</button><button className={'btn ' + (adjust ? 'primary' : 'danger')} onClick={() => onSave(a)}>{adjust ? 'บันทึกยอด' : 'ยืนยันตัดจำหน่าย'}</button></>}>
      <p style={{ marginBottom: 14 }}><b>{a.p.name}</b> · Lot <span className="mono">{a.l.lotNo}</span> · หมดอายุ {thDate(a.l.exp)} · ในระบบ {a.l.qty} {a.p.unit}</p>
      <div className="form-grid">
        {adjust && <Field label={`จำนวนที่นับได้จริง (${a.p.unit})`} hint={`ส่วนต่าง ${(parseInt(a.count) || 0) - a.l.qty}`}><input inputMode="numeric" value={a.count} onChange={(e) => setA({ ...a, count: e.target.value })} autoFocus /></Field>}
        <Field label="เหตุผล" className={adjust ? '' : 'span2'}><input value={a.reason} onChange={(e) => setA({ ...a, reason: e.target.value })} autoFocus={!adjust} /></Field>
      </div>
      {!adjust && <div className="alert danger" style={{ marginTop: 14 }}>จะนำ {a.l.qty} {a.p.unit} ออกจากสต็อกทั้งหมด และบันทึกในประวัติความเคลื่อนไหว</div>}
    </Modal>
  )
}
