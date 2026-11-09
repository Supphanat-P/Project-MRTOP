import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { PHARMACIST_ONLY } from '../data/seed.js'
import { baht, licenseStatus, stockOf, uid } from '../utils.js'
import { Badge, catClass, Field, Modal } from '../components/ui.jsx'
import ReceiptView, { DrugLabel } from '../components/ReceiptView.jsx'

export default function POS() {
  const { state, dispatch, me } = useStore()
  const [q, setQ] = useState('')
  const [cart, setCart] = useState([])
  const [customerId, setCustomerId] = useState('c1')
  const [pharmacistId, setPharmacistId] = useState(me.license && licenseStatus(me.license).key !== 'expired' ? me.id : '')
  const [rxNo, setRxNo] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState('cash')
  const [received, setReceived] = useState('')
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(null)
  const [printMode, setPrintMode] = useState('receipt')
  const inputRef = useRef(null)

  const pharmacists = state.staff.filter((s) => s.license && licenseStatus(s.license).key !== 'expired')
  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    return state.products.filter((p) => !k || p.name.toLowerCase().includes(k) || p.generic.toLowerCase().includes(k) || p.barcode.includes(k))
  }, [q, state.products])

  const flash = (text, tone = 'warn') => { setMsg({ text, tone }); setTimeout(() => setMsg(null), 2500) }

  const add = (p) => {
    const avail = stockOf(p)
    const inCart = cart.find((c) => c.productId === p.id)?.qty || 0
    if (inCart + 1 > avail) return flash(`${p.name} สต็อกไม่พอ (เหลือ ${avail})`, 'danger')
    setCart((c) => (c.some((x) => x.productId === p.id)
      ? c.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x))
      : [...c, { productId: p.id, qty: 1, price: p.price, dosage: p.dosage }]))
  }
  const setQty = (id, qty) => {
    const p = state.products.find((x) => x.id === id)
    if (qty > stockOf(p)) return flash('สต็อกไม่พอ', 'danger')
    setCart((c) => (qty <= 0 ? c.filter((x) => x.productId !== id) : c.map((x) => (x.productId === id ? { ...x, qty } : x))))
  }

  const onScan = (e) => {
    if (e.key !== 'Enter') return
    const p = state.products.find((x) => x.barcode === q.trim())
    if (p) { add(p); setQ('') } else if (list.length === 1) { add(list[0]); setQ('') }
    else flash('ไม่พบบาร์โค้ดนี้')
  }

  const lines = cart.map((c) => ({ ...c, p: state.products.find((x) => x.id === c.productId) }))
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const change = (Number(received) || 0) - total
  const needPharm = lines.some((l) => PHARMACIST_ONLY.includes(l.p.category))
  const needRx = lines.some((l) => l.p.category === 'ยาควบคุมพิเศษ')
  const cust = state.customers.find((c) => c.id === customerId)

  const checkout = () => {
    if (!cart.length) return flash('ยังไม่มีสินค้าในตะกร้า')
    if (needPharm && !pharmacistId) return flash('มียาอันตราย/ยาควบคุมพิเศษ ต้องระบุเภสัชกรผู้จ่ายยา', 'danger')
    if (needRx && (!rxNo.trim() || !prescriber.trim())) return flash('ยาควบคุมพิเศษต้องระบุเลขใบสั่งยาและชื่อแพทย์', 'danger')
    if (payment === 'cash' && change < 0) return flash('รับเงินไม่พอ', 'danger')
    const now = new Date()
    const no = 'R' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(state.receiptSeq + 1).padStart(4, '0')
    const receipt = {
      id: uid(), no, at: now.toISOString(), customerId, staffId: me.id,
      pharmacistId: needPharm || pharmacistId ? pharmacistId || null : null,
      rxNo: rxNo.trim() || null, prescriber: prescriber.trim() || null,
      subtotal, discount: Number(discount) || 0, total, payment,
      received: payment === 'cash' ? Number(received) : total, change: payment === 'cash' ? change : 0,
    }
    dispatch({ type: 'CHECKOUT', cart, receipt, gppIds: cart.map(() => uid()) })
    setDone(receipt.id)
    setCart([]); setDiscount(0); setReceived(''); setRxNo(''); setPrescriber(''); setCustomerId('c1')
  }

  const doneReceipt = state.receipts.find((r) => r.id === done)

  return (
    <div className="pos">
      <section className="pos-left card">
        <div className="scan-bar">
          <span>🔎</span>
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onScan}
            placeholder="สแกนบาร์โค้ด หรือพิมพ์ชื่อยา / ชื่อสามัญ แล้วกด Enter" />
        </div>
        {msg && <div className={'alert ' + msg.tone}>{msg.text}</div>}
        <div className="prod-grid">
          {list.map((p) => {
            const st = stockOf(p)
            return (
              <button key={p.id} className="prod" disabled={st <= 0} onClick={() => { add(p); inputRef.current?.focus() }}>
                <Badge cls={catClass(p.category)}>{p.category}</Badge>
                <div className="prod-name">{p.name}</div>
                <div className="prod-gen">{p.generic}</div>
                <div className="prod-foot">
                  <b>{baht(p.price)}</b>
                  <span className={st <= p.minStock ? 'txt-danger' : 'muted'}>คงเหลือ {st} {p.unit}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="pos-right card">
        <h3>🛒 ตะกร้า ({lines.length})</h3>
        <div className="cart">
          {!lines.length && <div className="empty">สแกนสินค้าเพื่อเริ่มขาย</div>}
          {lines.map((l) => (
            <div className="cart-line" key={l.productId}>
              <div className="cl-main">
                <div>{l.p.name} {PHARMACIST_ONLY.includes(l.p.category) && <Badge cls={catClass(l.p.category)}>{l.p.category}</Badge>}</div>
                <div className="muted small">{baht(l.price)} / {l.p.unit}</div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(l.productId, l.qty - 1)}>−</button>
                <input value={l.qty} onChange={(e) => setQty(l.productId, parseInt(e.target.value) || 0)} />
                <button onClick={() => setQty(l.productId, l.qty + 1)}>+</button>
              </div>
              <b className="cl-sum">{baht(l.price * l.qty)}</b>
            </div>
          ))}
        </div>

        <div className="grid2">
          <Field label="ลูกค้า">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {state.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={'เภสัชกรผู้จ่ายยา' + (needPharm ? ' *' : '')}>
            <select value={pharmacistId} onChange={(e) => setPharmacistId(e.target.value)} className={needPharm && !pharmacistId ? 'invalid' : ''}>
              <option value="">— ไม่ระบุ —</option>
              {pharmacists.map((s) => <option key={s.id} value={s.id}>{s.title} {s.name} ({s.license.no})</option>)}
            </select>
          </Field>
        </div>
        {cust?.allergies && <div className="alert danger">⚠️ ประวัติแพ้ยา: {cust.allergies}</div>}
        {needRx && (
          <div className="grid2">
            <Field label="เลขที่ใบสั่งยา *"><input value={rxNo} onChange={(e) => setRxNo(e.target.value)} /></Field>
            <Field label="แพทย์ผู้สั่ง *"><input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} /></Field>
          </div>
        )}

        <div className="totals">
          <div><span>รวม</span><span>{baht(subtotal)}</span></div>
          <div><span>ส่วนลด (บาท)</span><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div className="grand"><span>ยอดชำระ</span><span>{baht(total)}</span></div>
        </div>

        <div className="pay-tabs">
          {[['cash', '💵 เงินสด'], ['qr', '📱 QR'], ['card', '💳 บัตร']].map(([k, t]) => (
            <button key={k} className={payment === k ? 'active' : ''} onClick={() => setPayment(k)}>{t}</button>
          ))}
        </div>
        {payment === 'cash' && (
          <>
            <div className="quick-cash">
              {[total, 100, 500, 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                <button key={v} onClick={() => setReceived(String(v))}>{v === total ? 'พอดี' : baht(v)}</button>
              ))}
            </div>
            <div className="grid2">
              <Field label="รับเงิน"><input type="number" value={received} onChange={(e) => setReceived(e.target.value)} /></Field>
              <Field label="เงินทอน"><input readOnly value={received ? baht(change) : '-'} className={change < 0 ? 'invalid' : ''} /></Field>
            </div>
          </>
        )}
        {payment === 'qr' && <div className="qr-box"><div className="fake-qr" /><div>พร้อมเพย์ {state.settings.promptPay}<br /><b>{baht(total)}</b><br /><small className="muted">QR ตัวอย่าง — เชื่อมต่อผู้ให้บริการชำระเงินจริงภายหลัง</small></div></div>}
        <button className="btn primary big full" onClick={checkout}>✅ ชำระเงิน {baht(total)}</button>
      </section>

      {doneReceipt && (
        <Modal title="ขายสำเร็จ 🎉" onClose={() => setDone(null)}
          footer={<>
            <button className="btn" onClick={() => setPrintMode(printMode === 'receipt' ? 'labels' : 'receipt')}>
              {printMode === 'receipt' ? '🏷️ ดูฉลากยา' : '🧾 ดูใบเสร็จ'}
            </button>
            <button className="btn primary" onClick={() => window.print()}>🖨️ พิมพ์</button>
          </>}>
          {printMode === 'receipt' ? <ReceiptView receipt={doneReceipt} /> : (
            <div className="print-area labels">
              {doneReceipt.items.map((it, i) => <DrugLabel key={i} item={it} receipt={doneReceipt} />)}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
