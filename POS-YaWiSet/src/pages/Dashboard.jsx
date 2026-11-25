import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, expiredQty, licenseStatus, lotStatus, localDay, num, stockOf, thDate, today } from '../utils.js'
import { PageHead, Stat } from '../components/ui.jsx'
import { BarList, ChartTable, ColumnChart, Legend, ViewToggle } from '../components/Charts.jsx'

const CUT_DAYS = 7
const COST = '#2a78d6'
const PROFIT = '#1baf7a'
const LOSS = '#eb6834'
const MONEY = [
  { key: 'cost', label: 'ทุน', color: COST },
  { key: 'profit', label: 'กำไรขั้นต้น', color: PROFIT },
]
const LOSSES = [{ key: 'loss', label: 'ขาดดุล', color: LOSS }]
const LOSS_TYPES = ['write_off', 'adjust']

export default function Dashboard({ go }) {
  const { state, me } = useStore()
  const [range, setRange] = useState(7)
  const [view, setView] = useState('chart')

  const d = useMemo(() => {
    const valid = state.receipts.filter((r) => !r.voided)
    const t = today()
    const todays = valid.filter((r) => localDay(r.at) === t)
    const costOf = (id) => state.products.find((p) => p.id === id)?.cost || 0
    const days = Array.from({ length: range }, (_, i) => {
      const day = today(i - range + 1)
      const rs = valid.filter((r) => localDay(r.at) === day)
      const sales = rs.reduce((s, r) => s + r.total, 0)
      const cost = rs.reduce((s, r) => s + r.items.reduce((a, it) => a + it.cost * it.qty, 0), 0)
      const loss = state.moves
        .filter((m) => LOSS_TYPES.includes(m.type) && m.qty < 0 && localDay(m.at) === day)
        .reduce((s, m) => s + -m.qty * costOf(m.productId), 0)
      const dt = new Date(day + 'T00:00:00')
      return {
        key: day,
        label: range === 7 ? dt.toLocaleDateString('th-TH', { weekday: 'short' }) : String(dt.getDate()),
        title: thDate(day),
        values: { sales, cost, profit: sales - cost, loss },
        extra: [['ยอดขาย', baht(sales)], ['บิล', `${rs.length} บิล`]],
      }
    })
    const sum = (k) => days.reduce((s, x) => s + x.values[k], 0)
    const period = { sales: sum('sales'), cost: sum('cost'), profit: sum('profit'), loss: sum('loss') }
    const profit = todays.reduce((s, r) => s + r.items.reduce((a, it) => a + (it.price - it.cost) * it.qty, 0) - r.discount, 0)
    const low = state.products.filter((p) => stockOf(p) <= p.minStock)
    const expiring = state.products.flatMap((p) => p.lots.map((l) => ({ p, l, st: lotStatus(l) }))).filter((x) => x.st.key !== 'ok').sort((a, b) => a.st.days - b.st.days)
    const lic = state.staff.filter((s) => s.license && licenseStatus(s.license).key !== 'ok')
    const since = today(-(CUT_DAYS - 1))
    const cuts = state.moves.filter((m) => m.type === 'write_off' && localDay(m.at) >= since)
    const top = {}
    const from = today(-(range - 1))
    for (const r of valid) if (localDay(r.at) >= from) for (const it of r.items) top[it.name] = (top[it.name] || 0) + (it.price - it.cost) * it.qty
    const stockValue = state.products.reduce((s, p) => s + stockOf(p) * p.cost, 0)
    return { todays, days, period, profit, low, expiring, lic, cuts, top: Object.entries(top).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5), stockValue }
  }, [state, range])

  const unitOf = (id) => state.products.find((p) => p.id === id)?.unit || ''
  const staffName = (id) => state.staff.find((s) => s.id === id)?.name || '-'
  const net = d.period.profit - d.period.loss
  const sales = d.todays.reduce((s, r) => s + r.total, 0)

  return (
    <div className="page">
      <PageHead label="Dashboard" title="สวัสดี" em={me.name.split(' ')[0]} sub={`ภาพรวมร้าน ${state.settings.shopName} · ${thDate(today())}`}>
        <button className="btn primary" onClick={() => go('pos')}>เปิดหน้าขาย</button>
      </PageHead>

      <div className="grid stats">
        <Stat accent label="ยอดขายวันนี้" value={baht(sales)} change={`${d.todays.length} บิล`} />
        <Stat label="กำไรขั้นต้นวันนี้" value={baht(d.profit)} change={sales ? `${Math.round((d.profit / sales) * 100)}% ของยอดขาย` : '-'} />
        <Stat label="สินค้าใกล้หมด" value={num(d.low.length)} change="รายการ ต่ำกว่าขั้นต่ำ" />
        <Stat label="มูลค่าสต็อก (ทุน)" value={baht(d.stockValue)} change={`${state.products.length} รายการสินค้า`} />
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">ทุนและกำไร {range} วันล่าสุด</span><span className="spacer" />
            <div className="seg sm">{[7, 30].map((n) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>{n} วัน</button>)}</div>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div className="window-body">
            <div className="chart-summary">
              <div><small>ยอดขาย</small><b>{baht(d.period.sales)}</b></div>
              <div><small>ขาดดุล</small><b>{baht(d.period.loss)}</b></div>
              <div><small>กำไรสุทธิ</small><b style={{ color: net < 0 ? 'var(--danger)' : 'var(--accent)' }}>{baht(net)}</b></div>
            </div>
            <Legend series={MONEY} totals={d.period} fmt={baht} />
            {view === 'chart'
              ? <ColumnChart data={d.days} series={MONEY} fmt={baht} labelEvery={range === 7 ? 1 : 5} empty="ยังไม่มียอดขายในช่วงนี้" />
              : <ChartTable data={d.days} series={[...MONEY, ...LOSSES]} fmt={baht} />}
            <p className="muted small" style={{ marginTop: 10 }}>ความสูงแท่ง = ยอดขาย (ทุน + กำไรขั้นต้น) · กำไรสุทธิ = กำไรขั้นต้น - ขาดดุล</p>
          </div>
        </div>

        <div className="card">
          <h3>การแจ้งเตือน</h3>
          {d.cuts.length > 0 && <p className="muted small" style={{ marginBottom: 10 }}>ตัดสต็อกใน {CUT_DAYS} วันล่าสุด {d.cuts.length} รายการ</p>}
          <div className="grid" style={{ gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
            {d.cuts.slice(0, 5).map((m) => (
              <div key={m.id} className="alert danger">
                <b>ตัดสต็อก</b> {m.name} Lot {m.lotNo} จำนวน {-m.qty} {unitOf(m.productId)} · {m.note || '-'}
                {m.detail && <><br /><small>รายละเอียด: {m.detail}</small></>}
                <br /><small>{thDate(m.at, true)} · โดย {staffName(m.staffId)}{m.ref ? ` · เอกสาร ${m.ref}` : ''}</small>
              </div>
            ))}
            {d.lic.map((s) => (
              <div key={s.id} className={'alert ' + licenseStatus(s.license).cls}>
                ใบอนุญาตของ <b>{s.title} {s.name}</b> ({s.license.no}) - {licenseStatus(s.license).label}
              </div>
            ))}
            {d.expiring.slice(0, 6).map(({ p, l, st }) => (
              <div key={p.id + l.lotNo + l.exp} className={'alert ' + st.cls}>
                {p.name} Lot {l.lotNo} ({l.qty} {p.unit}) - {st.key === 'expired' ? `หมดอายุ ห้ามขาย · ${st.note.replace(' ห้ามขาย', '')} · ควรตัดสต็อก` : `${st.label} · ${st.note}`}
              </div>
            ))}
            {d.low.slice(0, 6).map((p) => (
              <div key={p.id} className="alert">{p.name} เหลือ {stockOf(p)} {p.unit} (ขั้นต่ำ {p.minStock}){expiredQty(p) ? ` · หมดอายุค้าง ${expiredQty(p)}` : ''}</div>
            ))}
            {!d.cuts.length && !d.lic.length && !d.expiring.length && !d.low.length && <p className="muted">ไม่มีรายการที่ต้องดำเนินการ ✓</p>}
          </div>
          {(d.cuts.length > 5 || d.expiring.length > 6 || d.low.length > 6) && <button className="btn sm" style={{ marginTop: 14 }} onClick={() => go('inventory')}>ดูทั้งหมดในคลังยา</button>}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">ขาดดุล {range} วันล่าสุด (ตัดสต็อก / ของขาดจากการตรวจนับ)</span></div>
          <div className="window-body">
            <Legend series={LOSSES} totals={d.period} fmt={baht} />
            {view === 'chart'
              ? <ColumnChart data={d.days.map((x) => ({ ...x, extra: null }))} series={LOSSES} fmt={baht} height={140} labelEvery={range === 7 ? 1 : 5} empty="ไม่มีการตัดสต็อกในช่วงนี้" />
              : <ChartTable data={d.days} series={LOSSES} fmt={baht} />}
            <p className="muted small" style={{ marginTop: 10 }}>คิดจากราคาทุนของสินค้าที่ตัดสต็อกหรือนับได้น้อยกว่าในระบบ</p>
          </div>
        </div>
        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">สินค้าทำกำไรสูงสุด {range} วันล่าสุด</span></div>
          <div className="window-body">
            {d.top.length
              ? <BarList items={d.top.map(([label, value]) => ({ label, value }))} color={PROFIT} fmt={baht} />
              : <p className="muted small">ยังไม่มียอดขายในช่วงนี้</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
