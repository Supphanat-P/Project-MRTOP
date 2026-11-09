import { useStore } from '../store.jsx'
import { baht, daysUntil, expiredQty, licenseStatus, stockOf, thDate, today } from '../utils.js'
import { Badge, Stat } from '../components/ui.jsx'

export default function Dashboard({ go }) {
  const { state } = useStore()
  const t = today()
  const valid = state.receipts.filter((r) => !r.voided)
  const todays = valid.filter((r) => r.at.slice(0, 10) === t)
  const rev = todays.reduce((s, r) => s + r.total, 0)
  const cost = todays.reduce((s, r) => s + r.items.reduce((a, i) => a + i.cost * i.qty, 0), 0)

  // 7 วันล่าสุด
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const k = d.toISOString().slice(0, 10)
    return { k, label: d.toLocaleDateString('th-TH', { weekday: 'short' }), v: valid.filter((r) => r.at.slice(0, 10) === k).reduce((s, r) => s + r.total, 0) }
  })
  const max = Math.max(1, ...days.map((d) => d.v))

  const best = {}
  valid.forEach((r) => r.items.forEach((i) => { best[i.name] = (best[i.name] || 0) + i.qty }))
  const top = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const low = state.products.filter((p) => stockOf(p) <= p.minStock)
  const expiring = state.products.flatMap((p) => p.lots.map((l) => ({ p, l, n: daysUntil(l.exp) }))).filter((x) => x.n <= 90).sort((a, b) => a.n - b.n)
  const licAlerts = state.staff.filter((s) => s.license && licenseStatus(s.license).key !== 'ok')

  return (
    <div className="page">
      <div className="page-head"><h2>📊 ภาพรวมวันนี้</h2><span className="muted">{thDate(new Date().toISOString())}</span></div>
      <div className="stats">
        <Stat icon="💰" label="ยอดขายวันนี้" value={baht(rev)} sub={`${todays.length} บิล`} />
        <Stat icon="📈" label="กำไรขั้นต้น" value={baht(rev - cost)} sub={rev ? `${(((rev - cost) / rev) * 100).toFixed(1)}%` : '—'} tone="ok" />
        <Stat icon="⚠️" label="สินค้าใกล้หมด" value={low.length + ' รายการ'} tone={low.length ? 'warn' : ''} />
        <Stat icon="⏰" label="หมดอายุ / ใกล้หมด" value={state.products.reduce((s, p) => s + (expiredQty(p) > 0 ? 1 : 0), 0) + ' / ' + expiring.filter((x) => x.n >= 0).length} sub="lot" tone={expiring.length ? 'danger' : ''} />
      </div>

      {licAlerts.length > 0 && (
        <div className="alert warn">
          🪪 ใบอนุญาตเภสัชกรต้องดำเนินการ: {licAlerts.map((s) => <span key={s.id}> <b>{s.title}{s.name}</b> ({licenseStatus(s.license).label})</span>)}
          <button className="btn sm" onClick={() => go('staff')}>ดูรายละเอียด</button>
        </div>
      )}

      <div className="grid-dash">
        <div className="card">
          <h3>ยอดขาย 7 วันล่าสุด</h3>
          <div className="bars">
            {days.map((d) => (
              <div key={d.k} className="bar-col" title={baht(d.v)}>
                <div className="bar-val">{d.v ? Math.round(d.v).toLocaleString() : ''}</div>
                <div className="bar" style={{ height: `${(d.v / max) * 100}%` }} />
                <div className="bar-lbl">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>🏆 ยาขายดี</h3>
          {!top.length ? <div className="empty">ยังไม่มีการขาย</div> : (
            <ol className="rank">{top.map(([n, q]) => <li key={n}><span>{n}</span><b>{q}</b></li>)}</ol>
          )}
        </div>
        <div className="card">
          <h3>⏰ ยาหมดอายุ / ใกล้หมดอายุ (90 วัน)</h3>
          {!expiring.length ? <div className="empty">ไม่มี 🎉</div> : (
            <table className="tbl compact"><tbody>
              {expiring.slice(0, 8).map(({ p, l, n }) => (
                <tr key={p.id + l.lotNo}><td>{p.name}<div className="muted small">Lot {l.lotNo} · {l.qty} {p.unit}</div></td>
                  <td className="r">{n < 0 ? <Badge cls="danger">หมดอายุ</Badge> : <Badge cls={n <= 30 ? 'danger' : 'warn'}>{n} วัน</Badge>}</td></tr>
              ))}
            </tbody></table>
          )}
          <button className="btn sm mt" onClick={() => go('inventory')}>จัดการคลังยา →</button>
        </div>
        <div className="card">
          <h3>📉 สินค้าใกล้หมดสต็อก</h3>
          {!low.length ? <div className="empty">สต็อกเพียงพอ</div> : (
            <table className="tbl compact"><tbody>
              {low.map((p) => <tr key={p.id}><td>{p.name}</td><td className="r"><b className="txt-danger">{stockOf(p)}</b> / {p.minStock} {p.unit}</td></tr>)}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  )
}
