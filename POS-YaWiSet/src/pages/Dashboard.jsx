import { useMemo } from 'react'
import { useStore } from '../store.jsx'
import { baht, daysUntil, expiredQty, licenseStatus, localDay, num, stockOf, thDate, today } from '../utils.js'
import { Badge, PageHead, Stat } from '../components/ui.jsx'

export default function Dashboard({ go }) {
  const { state, me } = useStore()

  const d = useMemo(() => {
    const valid = state.receipts.filter((r) => !r.voided)
    const t = today()
    const todays = valid.filter((r) => localDay(r.at) === t)
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = today(i - 6)
      return { day, total: valid.filter((r) => localDay(r.at) === day).reduce((s, r) => s + r.total, 0) }
    })
    const profit = todays.reduce((s, r) => s + r.items.reduce((a, it) => a + (it.price - it.cost) * it.qty, 0) - r.discount, 0)
    const low = state.products.filter((p) => stockOf(p) <= p.minStock)
    const expiring = state.products.flatMap((p) => p.lots.map((l) => ({ p, l, n: daysUntil(l.exp) }))).filter((x) => x.n <= 90).sort((a, b) => a.n - b.n)
    const lic = state.staff.filter((s) => s.license && licenseStatus(s.license).key !== 'ok')
    const top = {}
    for (const r of valid) for (const it of r.items) top[it.name] = (top[it.name] || 0) + it.qty
    const stockValue = state.products.reduce((s, p) => s + stockOf(p) * p.cost, 0)
    return { todays, days, profit, low, expiring, lic, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), stockValue }
  }, [state])

  const max = Math.max(...d.days.map((x) => x.total), 1)
  const sales = d.todays.reduce((s, r) => s + r.total, 0)

  return (
    <div className="page">
      <PageHead label="Dashboard" title="สวัสดี" em={me.name.split(' ')[0]} sub={`ภาพรวมร้าน ${state.settings.shopName} · ${thDate(today())}`}>
        <button className="btn primary" onClick={() => go('pos')}>เปิดหน้าขาย →</button>
      </PageHead>

      <div className="grid stats">
        <Stat accent label="ยอดขายวันนี้" value={baht(sales)} change={`${d.todays.length} บิล`} />
        <Stat label="กำไรขั้นต้นวันนี้" value={baht(d.profit)} change={sales ? `${Math.round((d.profit / sales) * 100)}% ของยอดขาย` : '—'} />
        <Stat label="สินค้าใกล้หมด" value={num(d.low.length)} change="รายการ ต่ำกว่าขั้นต่ำ" />
        <Stat label="มูลค่าสต็อก (ทุน)" value={baht(d.stockValue)} change={`${state.products.length} รายการสินค้า`} />
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">ยอดขาย 7 วันล่าสุด</span><span className="spacer" /></div>
          <div className="window-body">
            <div className="bars">
              {d.days.map((x, i) => (
                <div className="bar-col" key={x.day} title={`${thDate(x.day)} · ${baht(x.total)}`}>
                  <div className={'bar' + (i === 6 ? ' active' : '')} style={{ height: `${(x.total / max) * 100}%` }} />
                  <small>{new Date(x.day + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short' })}</small>
                </div>
              ))}
            </div>
            <h3 style={{ marginTop: 22 }}>สินค้าขายดี</h3>
            {d.top.length ? d.top.map(([n, q], i) => (
              <div key={n} className="row between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '.88rem' }}>
                <span><b style={{ color: 'var(--accent)' }}>{i + 1}.</b> {n}</span><span className="muted">{num(q)} หน่วย</span>
              </div>
            )) : <p className="muted small">ยังไม่มียอดขาย</p>}
          </div>
        </div>

        <div className="card">
          <h3>การแจ้งเตือน</h3>
          <div className="grid" style={{ gap: 10 }}>
            {d.lic.map((s) => (
              <div key={s.id} className={'alert ' + licenseStatus(s.license).cls}>
                🪪 ใบอนุญาตของ <b>{s.title} {s.name}</b> ({s.license.no}) — {licenseStatus(s.license).label}
              </div>
            ))}
            {d.expiring.slice(0, 6).map(({ p, l, n }) => (
              <div key={p.id + l.lotNo + l.exp} className={'alert ' + (n < 0 ? 'danger' : 'warn')}>
                ⏳ {p.name} Lot {l.lotNo} ({l.qty} {p.unit}) — {n < 0 ? `หมดอายุแล้ว ${-n} วัน` : `หมดอายุใน ${n} วัน`}
              </div>
            ))}
            {d.low.slice(0, 6).map((p) => (
              <div key={p.id} className="alert">📦 {p.name} เหลือ {stockOf(p)} {p.unit} (ขั้นต่ำ {p.minStock}){expiredQty(p) ? ` · หมดอายุค้าง ${expiredQty(p)}` : ''}</div>
            ))}
            {!d.lic.length && !d.expiring.length && !d.low.length && <p className="muted">ไม่มีรายการที่ต้องดำเนินการ ✓</p>}
          </div>
          {(d.expiring.length > 6 || d.low.length > 6) && <button className="btn sm" style={{ marginTop: 14 }} onClick={() => go('inventory')}>ดูทั้งหมดในคลังยา →</button>}
        </div>
      </div>
    </div>
  )
}
