import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, CATEGORIES, licenseStatus, PHARMACIST_ONLY, printModal, stockOf } from '../utils.js'
import { Badge, CatTag, Field, Modal } from '../components/ui.jsx'
import ReceiptView, { DrugLabel } from '../components/ReceiptView.jsx'

export default function POS() {
  const { state, act, me, busy, notify } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [cart, setCart] = useState([])
  const [customerId, setCustomerId] = useState('c1')
  const [pharmacistId, setPharmacistId] = useState(me.license && licenseStatus(me.license).key !== 'expired' ? me.id : '')
  const [rxNo, setRxNo] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [discount, setDiscount] = useState('')
  const [payment, setPayment] = useState('cash')
  const [received, setReceived] = useState('')
  const [done, setDone] = useState(null)
  const [printMode, setPrintMode] = useState('receipt')

  const pharmacists = state.staff.filter((s) => s.license && licenseStatus(s.license).key !== 'expired')
  const found = useMemo(() => {
    const k = q.trim().toLowerCase()
    return state.products.filter((p) => (!cat || p.category === cat) &&
      (!k || p.name.toLowerCase().includes(k) || p.generic.toLowerCase().includes(k) || p.barcode.includes(k)))
  }, [state.products, q, cat])

  const add = (p, n = 1) => {
    const have = cart.find((c) => c.productId === p.id)?.qty || 0
    if (have + n > stockOf(p)) return notify(`${p.name} มีสต็อกพร้อมขาย ${stockOf(p)} ${p.unit}`, 'danger')
    setCart(have ? cart.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + n } : c)) : [...cart, { productId: p.id, qty: n }])
  }
  const setQty = (id, v) => {
    const p = state.products.find((x) => x.id === id)
    const n = Math.min(Math.max(parseInt(v) || 0, 0), stockOf(p))
    setCart(n ? cart.map((c) => (c.productId === id ? { ...c, qty: n } : c)) : cart.filter((c) => c.productId !== id))
  }

  // สแกนบาร์โค้ดแล้วกด Enter → เพิ่มลงตะกร้าทันที
  const onScan = (e) => {
    if (e.key !== 'Enter') return
    const p = state.products.find((x) => x.barcode === q.trim()) || (found.length === 1 ? found[0] : null)
    if (p) { add(p); setQ('') }
  }

  const lines = cart.map((c) => ({ ...c, p: state.products.find((p) => p.id === c.productId) })).filter((l) => l.p)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const disc = Math.min(Number(discount) || 0, subtotal)
  const total = subtotal - disc
  const change = (Number(received) || 0) - total
  const needPharm = lines.some((l) => PHARMACIST_ONLY.includes(l.p.category))
  const needRx = lines.some((l) => l.p.category === 'ยาควบคุมพิเศษ')
  const cust = state.customers.find((c) => c.id === customerId)

  const checkout = async () => {
    if (!lines.length) return notify('ยังไม่มีสินค้าในตะกร้า', 'danger')
    if (needPharm && !pharmacistId) return notify('มียาอันตราย/ยาควบคุมพิเศษ ต้องระบุเภสัชกรผู้จ่ายยา', 'danger')
    if (needRx && (!rxNo.trim() || !prescriber.trim())) return notify('ยาควบคุมพิเศษต้องระบุเลขใบสั่งยาและชื่อแพทย์', 'danger')
    if (payment === 'cash' && change < 0) return notify('รับเงินไม่พอ', 'danger')
    const res = await act('checkout', {
      cart: cart.map(({ productId, qty }) => ({ productId, qty })),
      receipt: { customerId, pharmacistId: pharmacistId || null, rxNo, prescriber, discount: disc, payment, received: payment === 'cash' ? Number(received) : total },
    })
    if (!res) return
    setDone(res.id)
    setCart([]); setDiscount(''); setReceived(''); setRxNo(''); setPrescriber(''); setCustomerId('c1')
  }

  const doneReceipt = state.receipts.find((r) => r.id === done)
  const quick = [20, 50, 100, 500, 1000].filter((v) => v >= total)

  return (
    <div className="page">
      <div className="pos">
        <section>
          <div className="section-label">Point of Sale</div>
          <h1 className="section-title">ขายหน้า<em>ร้าน</em></h1>
          <div className="row" style={{ marginTop: 16 }}>
            <div className="search"><input autoFocus placeholder="ค้นหาชื่อยา / ชื่อสามัญ / สแกนบาร์โค้ดแล้วกด Enter" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onScan} /></div>
          </div>
          <div className="seg" style={{ marginTop: 12 }}>
            <button className={!cat ? 'on' : ''} onClick={() => setCat('')}>ทั้งหมด</button>
            {CATEGORIES.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="prod-grid">
            {found.map((p) => {
              const st = stockOf(p)
              return (
                <button key={p.id} className="prod" disabled={!st} onClick={() => add(p)}>
                  <CatTag category={p.category} />
                  <span className="name">{p.name}</span>
                  <span className="gen">{p.generic}</span>
                  <span className="row between" style={{ marginTop: 'auto' }}>
                    <span className="price">{baht(p.price)}</span>
                    <Badge cls={!st ? 'danger' : st <= p.minStock ? 'warn' : 'muted'}>{st ? `${st} ${p.unit}` : 'หมด'}</Badge>
                  </span>
                </button>
              )
            })}
            {!found.length && <p className="muted">ไม่พบสินค้า</p>}
          </div>
        </section>

        <aside className="window cart">
          <div className="window-bar"><i /><i /><i /><span className="title">ตะกร้า · {lines.length} รายการ</span><span className="spacer" />
            {lines.length > 0 && <button className="btn ghost sm" onClick={() => setCart([])}>ล้าง</button>}
          </div>
          <div className="window-body">
            <Field label="ลูกค้า">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {state.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
            </Field>
            {cust?.allergies && <div className="alert danger" style={{ marginTop: 8 }}>⚠ ประวัติแพ้ยา: {cust.allergies}</div>}

            <div className="cart-list" style={{ marginTop: 12 }}>
              {lines.map((l) => (
                <div className="cart-line" key={l.productId}>
                  <div><div className="nm">{l.p.name}</div><small className="muted">{baht(l.p.price)} / {l.p.unit}</small>
                    {PHARMACIST_ONLY.includes(l.p.category) && <div><CatTag category={l.p.category} /></div>}</div>
                  <div className="qty">
                    <button onClick={() => setQty(l.productId, l.qty - 1)} aria-label="ลด">−</button>
                    <input value={l.qty} onChange={(e) => setQty(l.productId, e.target.value)} aria-label="จำนวน" />
                    <button onClick={() => add(l.p)} aria-label="เพิ่ม">+</button>
                  </div>
                  <b className="nowrap">{baht(l.p.price * l.qty)}</b>
                </div>
              ))}
              {!lines.length && <p className="empty">แตะสินค้าเพื่อเพิ่มลงตะกร้า</p>}
            </div>

            {(needPharm || pharmacistId) && (
              <fieldset className="fs">
                <legend>เภสัชกรผู้จ่ายยา {needPharm && '*'}</legend>
                <select value={pharmacistId} onChange={(e) => setPharmacistId(e.target.value)}>
                  <option value="">— เลือกเภสัชกร —</option>
                  {pharmacists.map((s) => <option key={s.id} value={s.id}>{s.title} {s.name} · {s.license.no}</option>)}
                </select>
                {needRx && (
                  <div className="form-grid" style={{ marginTop: 10 }}>
                    <Field label="เลขที่ใบสั่งยา *"><input value={rxNo} onChange={(e) => setRxNo(e.target.value)} /></Field>
                    <Field label="แพทย์ผู้สั่ง *"><input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} /></Field>
                  </div>
                )}
              </fieldset>
            )}

            <div className="totals">
              <div className="row between"><span className="muted">รวม</span><span>{baht(subtotal)}</span></div>
              <div className="row between"><span className="muted">ส่วนลด (บาท)</span>
                <input style={{ width: 110, textAlign: 'right', padding: '6px 10px' }} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></div>
              <div className="row between"><span>ยอดสุทธิ</span><span className="grand">{baht(total)}</span></div>
            </div>

            <div className="pay-opts">
              {[['cash', '💵 เงินสด'], ['qr', '▦ พร้อมเพย์'], ['card', '💳 บัตร']].map(([k, v]) => (
                <button key={k} className={payment === k ? 'on' : ''} onClick={() => setPayment(k)}>{v}</button>
              ))}
            </div>
            {payment === 'cash' && (
              <div style={{ marginTop: 12 }}>
                <Field label="รับเงิน"><input inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={total.toFixed(2)} /></Field>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => setReceived(String(total))}>พอดี</button>
                  {quick.slice(0, 4).map((v) => <button key={v} className="btn sm" onClick={() => setReceived(String(v))}>{v}</button>)}
                  <span className="spacer" />
                  {received !== '' && <b style={{ color: change < 0 ? 'var(--danger)' : 'var(--accent)' }}>ทอน {baht(Math.max(change, 0))}</b>}
                </div>
              </div>
            )}
            {payment === 'qr' && <div className="qr-box" style={{ marginTop: 12 }}><div className="fake-qr" /><div>พร้อมเพย์ {state.settings.promptPay}<br /><b>{baht(total)}</b><br /><small className="muted">QR ตัวอย่าง — ยังไม่เชื่อมผู้ให้บริการชำระเงิน</small></div></div>}

            <button className="btn primary lg full" style={{ marginTop: 16 }} disabled={busy || !lines.length} onClick={checkout}>
              {busy ? 'กำลังบันทึก…' : `ชำระเงิน ${baht(total)} →`}
            </button>
          </div>
        </aside>
      </div>

      {doneReceipt && (
        <Modal title={`ขายสำเร็จ · ${doneReceipt.no}`} onClose={() => setDone(null)}
          footer={<>
            <div className="seg left">
              <button className={printMode === 'receipt' ? 'on' : ''} onClick={() => setPrintMode('receipt')}>ใบเสร็จ</button>
              <button className={printMode === 'label' ? 'on' : ''} onClick={() => setPrintMode('label')}>ฉลากยา</button>
            </div>
            <button className="btn" onClick={() => setDone(null)}>ปิด</button>
            <button className="btn primary" onClick={printModal}>🖨 พิมพ์</button>
          </>}>
          {printMode === 'receipt' ? <ReceiptView receipt={doneReceipt} />
            : doneReceipt.items.map((it, i) => <DrugLabel key={i} item={it} receipt={doneReceipt} />)}
        </Modal>
      )}
    </div>
  )
}
