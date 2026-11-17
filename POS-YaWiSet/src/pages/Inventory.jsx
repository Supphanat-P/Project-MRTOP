import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, CATEGORIES, downloadCSV, expiredQty, lotStatus, MOVE_LABEL, nextLot, num, SELL_BEFORE_MONTHS, SELL_SOON_DAYS, stockOf, thDate, today, totalQty, uid, UNITS } from '../utils.js'
import { Badge, CatTag, Field, Modal, PageHead, Stat } from '../components/ui.jsx'

const WRITE_OFF_REASONS = ['ยาหมดอายุ', `เหลืออายุไม่ถึง ${SELL_BEFORE_MONTHS} เดือน (ห้ามขาย)`, 'ชำรุด / เสียหาย', 'ส่งคืนผู้จำหน่าย', 'สูญหาย', 'อื่น ๆ']
const cutLabel = (ls) => (ls.sellable ? 'ขายได้ก่อน ' : 'หยุดขายตั้งแต่ ') + thDate(ls.cutoff)
const lotNums = (l) => {
  const received = l.received ?? l.qty
  const sold = l.sold ?? 0
  return { received, sold, removed: received - sold - l.qty }
}
const hasSoon = (p) => p.lots.some((l) => lotStatus(l).key === 'soon')
const defaultReason = (l) => {
  if (lotStatus(l).key !== 'expired') return ''
  return l.exp < today() ? WRITE_OFF_REASONS[0] : WRITE_OFF_REASONS[1]
}

const blank = { id: '', barcode: '', name: '', generic: '', category: CATEGORIES[0], unit: 'แผง', price: '', cost: '', minStock: 10, dosage: '', lots: [] }

export default function Inventory() {
  const { state, act } = useStore()
  const [tab, setTab] = useState('stock')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [hidden, setHidden] = useState({})
  const [hideAll, setHideAll] = useState(true)
  const lotsShown = (id) => hidden[id] ?? !hideAll
  const toggleAll = () => { setHideAll(!hideAll); setHidden({}) }
  const [recv, setRecv] = useState(null)
  const [lotAct, setLotAct] = useState(null)

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return state.products.filter((p) => {
      if (k && !(p.name.toLowerCase().includes(k) || p.generic.toLowerCase().includes(k) || p.barcode.includes(k))) return false
      if (filter === 'low') return stockOf(p) <= p.minStock
      if (filter === 'soon') return hasSoon(p)
      if (filter === 'expired') return expiredQty(p) > 0
      return true
    })
  }, [state.products, q, filter])

  const totals = useMemo(() => ({
    value: state.products.reduce((s, p) => s + stockOf(p) * p.cost, 0),
    low: state.products.filter((p) => stockOf(p) <= p.minStock).length,
    soon: state.products.filter(hasSoon).length,
    expired: state.products.filter((p) => expiredQty(p) > 0).length,
  }), [state.products])

  const exportCSV = () => downloadCSV(`stock-${today()}.csv`, [
    ['บาร์โค้ด', 'ชื่อ', 'ชื่อสามัญ', 'ประเภท', 'หน่วย', 'Lot', 'วันหมดอายุ', 'วันหยุดขาย', 'สถานะ', 'ทั้งหมด', 'ขายแล้ว', 'ตัด/ปรับ', 'คงเหลือ', 'ขายได้', 'ทุน', 'ราคาขาย'],
    ...state.products.flatMap((p) => (p.lots.length ? p.lots : [null]).map((l) => {
      const st = l && lotStatus(l)
      const ln = l ? lotNums(l) : { received: 0, sold: 0, removed: 0 }
      return [p.barcode, p.name, p.generic, p.category, p.unit, l?.lotNo || '-', l?.exp || '', st?.cutoff || '', st?.label || '', ln.received, ln.sold, ln.removed, l?.qty || 0, st?.sellQty || 0, p.cost, p.price]
    })),
  ])

  return (
    <div className="page">
      <PageHead label="Inventory" title="คลังยา &" em="สต็อก" sub="จัดการสินค้า รับยาเข้า ตรวจนับ และติดตามวันหมดอายุแยกตาม Lot">
        <button className="btn" onClick={exportCSV}>CSV</button>
        <button className="btn" onClick={() => setRecv({ productId: state.products[0]?.id || '', lotNo: '', exp: today(365), qty: '', cost: '', supplier: '', invoiceNo: '' })}>＋ รับยาเข้า</button>
        <button className="btn primary" onClick={() => setEdit({ ...blank })}>＋ เพิ่มสินค้า</button>
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="มูลค่าสต็อก (ทุน)" value={baht(totals.value)} change={`${state.products.length} รายการ`} />
        <Stat label="ต่ำกว่าขั้นต่ำ" value={num(totals.low)} change="ควรสั่งซื้อเพิ่ม" />
        <Stat label={`ต้องขายภายใน ${SELL_SOON_DAYS} วัน`} value={num(totals.soon)} change={`ต้องขายก่อนหมดอายุ ${SELL_BEFORE_MONTHS} เดือน`} />
        <Stat label="มี Lot หมดอายุ" value={num(totals.expired)} change={`รวมที่เหลืออายุไม่ถึง ${SELL_BEFORE_MONTHS} เดือน · ควรตัดสต็อก`} />
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
              {[['all', 'ทั้งหมด'], ['low', 'ใกล้หมด'], ['soon', 'ต้องรีบขาย'], ['expired', 'หมดอายุ']].map(([k, v]) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
              ))}
            </div>
            <button className="btn sm ghost" onClick={toggleAll}>{hideAll ? 'แสดง Lot ทั้งหมด' : 'ซ่อน Lot ทั้งหมด'}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>สินค้า / Lot</th><th>ประเภท</th><th className="right">ราคา / ทุน</th><th className="right">ทั้งหมด</th><th className="right">ขายแล้ว</th><th className="right">คงเหลือ</th><th className="right">ขายได้</th><th>สถานะ</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const st = stockOf(p)
                  const sum = p.lots.reduce((a, l) => { const n = lotNums(l); return { received: a.received + n.received, sold: a.sold + n.sold } }, { received: 0, sold: 0 })
                  const nl = nextLot(p)
                  const ns = nl && lotStatus(nl)
                  return (
                    <Fragment key={p.id}>
                      <tr>
                        <td><b>{p.name}</b><br /><small className="muted">{p.generic} · <span className="mono">{p.barcode}</span></small></td>
                        <td><CatTag category={p.category} /></td>
                        <td className="right nowrap">{baht(p.price)}<br /><small className="muted">ทุน {baht(p.cost)}</small></td>
                        <td className="right nowrap"><b>{num(sum.received)}</b></td>
                        <td className="right nowrap"><b>{num(sum.sold)}</b></td>
                        <td className="right nowrap"><b>{num(totalQty(p))}</b> <small className="muted">{p.unit}</small></td>
                        <td className="right nowrap"><Badge cls={!st ? 'danger' : st <= p.minStock ? 'warn' : 'ok'}>{num(st)} {p.unit}</Badge></td>
                        <td>{nl ? <Badge cls={ns.cls}>{ns.label}</Badge> : <Badge cls="danger">ไม่มีของขาย</Badge>}</td>
                        <td className="right nowrap">
                          <button className="btn sm ghost" onClick={() => setHidden({ ...hidden, [p.id]: !lotsShown(p.id) })}>{lotsShown(p.id) ? 'ซ่อน Lot' : `แสดง Lot (${p.lots.length})`}</button>
                          <button className="btn sm" onClick={() => setEdit({ ...p })}>แก้ไข</button>
                        </td>
                      </tr>
                      {lotsShown(p.id) && (p.lots.length ? p.lots.map((l) => {
                        const ls = lotStatus(l)
                        const ln = lotNums(l)
                        return (
                          <tr className="sub" key={l.lotNo + l.exp}>
                            <td colSpan={3}>&nbsp;&nbsp;Lot <b className="mono">{l.lotNo}</b><br /><small className="muted">&nbsp;&nbsp;หมดอายุ {thDate(l.exp)} · {cutLabel(ls)}</small></td>
                            <td className="right nowrap">{num(ln.received)}</td>
                            <td className="right nowrap">{num(ln.sold)}{ln.removed ? <><br /><small className="muted">ตัด/ปรับ {num(ln.removed)}</small></> : null}</td>
                            <td className="right nowrap"><b>{num(l.qty)}</b></td>
                            <td className="right nowrap"><b style={{ color: ls.sellable ? 'var(--accent)' : 'var(--danger)' }}>{num(ls.sellQty)}</b></td>
                            <td><Badge cls={ls.cls}>{ls.label}</Badge><br /><small className="muted">{ls.note}</small></td>
                            <td className="right nowrap">
                              <button className="btn sm" onClick={() => setLotAct({ kind: 'adjust', p, l, count: l.qty, reason: 'ตรวจนับสต็อก', detail: '' })}>ตรวจนับ</button>
                              <button className="btn sm danger" onClick={() => setLotAct({ kind: 'writeOff', p, l, qty: String(l.qty), reason: defaultReason(l), detail: '', ref: '' })}>ตัดสต็อก</button>
                            </td>
                          </tr>
                        )
                      }) : <tr className="sub"><td colSpan={9} className="muted">&nbsp;&nbsp;ยังไม่มีสต็อก</td></tr>)}
                    </Fragment>
                  )
                })}
                {!rows.length && <tr><td colSpan={9} className="empty">ไม่พบสินค้า</td></tr>}
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
        const body = { productId: a.p.id, lotNo: a.l.lotNo, exp: a.l.exp, reason: a.reason, detail: a.detail, count: a.count, qty: a.qty, ref: a.ref }
        if (await act(a.kind, body, a.kind === 'adjust' ? 'ปรับยอดแล้ว' : 'ตัดสต็อกแล้ว')) setLotAct(null)
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
          <thead><tr><th>เวลา</th><th>ประเภท</th><th>สินค้า</th><th>Lot</th><th className="right">จำนวน</th><th className="right">คงเหลือใน Lot</th><th>อ้างอิง / รายละเอียด</th><th>ผู้ทำรายการ</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{thDate(m.at, true)}</td>
                <td><Badge cls={{ receive: 'ok', sale: 'muted', write_off: 'danger', void: 'violet', adjust: 'warn' }[m.type]}>{MOVE_LABEL[m.type]}</Badge></td>
                <td>{m.name}</td>
                <td className="mono">{m.lotNo}</td>
                <td className="right" style={{ fontWeight: 700, color: m.qty > 0 ? 'var(--accent)' : 'var(--danger)' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td className="right muted">{m.balance ?? '-'}</td>
                <td><small>{[m.ref, m.note].filter(Boolean).join(' · ') || '-'}</small>{m.detail && <><br /><small className="muted">{m.detail}</small></>}</td>
                <td>{staff(m.staffId)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="empty">ยังไม่มีรายการ</td></tr>}
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
      {r.exp && !lotStatus({ exp: r.exp, qty: 0 }).sellable && <div className="alert danger" style={{ marginTop: 14 }}>Lot นี้เหลืออายุไม่ถึง {SELL_BEFORE_MONTHS} เดือน จะเป็นสถานะหมดอายุทันทีและขายไม่ได้</div>}
    </Modal>
  )
}

function LotAction({ a: initial, onClose, onSave }) {
  const [a, setA] = useState(initial)
  const adjust = a.kind === 'adjust'
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value })
  const ls = lotStatus(a.l)
  const ln = lotNums(a.l)
  const cut = parseInt(a.qty) || 0
  const left = Math.max(a.l.qty - cut, 0)
  const save = () => {
    if (adjust) return onSave(a)
    if (!a.reason) return alert('กรุณาเลือกสาเหตุ')
    if (!(cut > 0 && cut <= a.l.qty)) return alert(`จำนวนที่ตัดต้องอยู่ระหว่าง 1 - ${a.l.qty}`)
    if (!a.detail.trim()) return alert('กรุณากรอกรายละเอียดการตัดสต็อก')
    onSave(a)
  }
  return (
    <Modal title={adjust ? 'ตรวจนับ / ปรับยอด Lot' : 'ตัดสต็อก Lot'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>ยกเลิก</button><button className={'btn ' + (adjust ? 'primary' : 'danger')} onClick={save}>{adjust ? 'บันทึกยอด' : 'ยืนยันตัดสต็อก'}</button></>}>
      <p style={{ marginBottom: 6 }}><b>{a.p.name}</b> · Lot <span className="mono">{a.l.lotNo}</span> <Badge cls={ls.cls}>{ls.label}</Badge></p>
      <p className="muted small" style={{ marginBottom: 14 }}>หมดอายุ {thDate(a.l.exp)} · {cutLabel(ls)}<br />ทั้งหมด {ln.received} · ขายแล้ว {ln.sold}{ln.removed ? ` · ตัด/ปรับ ${ln.removed}` : ''} · คงเหลือ {a.l.qty} · ขายได้ {ls.sellQty} {a.p.unit}</p>
      {adjust ? (
        <div className="form-grid">
          <Field label={`จำนวนที่นับได้จริง (${a.p.unit})`} hint={`ส่วนต่าง ${(parseInt(a.count) || 0) - a.l.qty}`}><input inputMode="numeric" value={a.count} onChange={set('count')} autoFocus /></Field>
          <Field label="เหตุผล"><input value={a.reason} onChange={set('reason')} /></Field>
          <Field label="รายละเอียด" className="span2"><textarea value={a.detail} onChange={set('detail')} maxLength={500} placeholder="เช่น ผู้ตรวจนับ, สาเหตุของส่วนต่าง" /></Field>
        </div>
      ) : (
        <>
          <div className="form-grid">
            <Field label="สาเหตุ *"><select value={a.reason} onChange={set('reason')}><option value="">เลือกสาเหตุ</option>{WRITE_OFF_REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label={`จำนวนที่ตัด (${a.p.unit}) *`} hint={`คงเหลือหลังตัด ${left} ${a.p.unit}`}>
              <input inputMode="numeric" value={a.qty} onChange={(e) => setA({ ...a, qty: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="เลขที่เอกสารอ้างอิง" hint="เช่น ใบทำลายยา ใบส่งคืน"><input value={a.ref} onChange={set('ref')} maxLength={100} /></Field>
            <Field label="รายละเอียด *" className="span2"><textarea value={a.detail} onChange={set('detail')} maxLength={500} autoFocus placeholder="เช่น วิธีทำลาย, วันที่ส่งคืน, ผู้รับคืน, พยาน, สภาพของยา" /></Field>
          </div>
          <div className="alert danger" style={{ marginTop: 14 }}>จะตัด {cut} {a.p.unit} ออกจาก Lot นี้ เหลือ {left} {a.p.unit} และบันทึกรายละเอียดในประวัติความเคลื่อนไหวสต็อก</div>
        </>
      )}
    </Modal>
  )
}
