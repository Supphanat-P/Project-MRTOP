import { useStore } from '../store.jsx'
import { baht, PAY_LABEL, thDate } from '../utils.js'

export default function ReceiptView({ receipt: r }) {
  const { state } = useStore()
  const s = state.settings
  const staff = state.staff.find((x) => x.id === r.staffId)
  const ph = state.staff.find((x) => x.id === r.pharmacistId)
  const cust = state.customers.find((c) => c.id === r.customerId)
  return (
    <div className="receipt">
      <div className="c b" style={{ fontSize: '.95rem' }}>{s.shopName}</div>
      <div className="c">{s.address}</div>
      <div className="c">โทร {s.phone} · เลขประจำตัวผู้เสียภาษี {s.taxId}</div>
      <div className="c">{s.licenseShop}</div>
      <hr />
      <div className="c b">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</div>
      <div className="ln"><span>เลขที่ {r.no}</span><span>{thDate(r.at, true)}</span></div>
      <div>ลูกค้า: {cust?.name || 'ลูกค้าทั่วไป'}</div>
      {r.rxNo && <div>ใบสั่งยา {r.rxNo} · {r.prescriber}</div>}
      {r.voided && <div className="void-stamp">ยกเลิกแล้ว - {r.voidReason}</div>}
      <hr />
      {r.items.map((it, i) => (
        <div key={i}>
          <div>{it.name}</div>
          <div className="ln"><span>&nbsp; {it.qty} {it.unit} × {it.price.toFixed(2)}</span><span>{(it.qty * it.price).toFixed(2)}</span></div>
        </div>
      ))}
      <hr />
      <div className="ln"><span>รวม</span><span>{baht(r.subtotal)}</span></div>
      {r.discount > 0 && <div className="ln"><span>ส่วนลด</span><span>-{baht(r.discount)}</span></div>}
      <div className="ln b" style={{ fontSize: '.95rem' }}><span>ยอดสุทธิ</span><span>{baht(r.total)}</span></div>
      <div className="ln"><span>ชำระโดย {PAY_LABEL[r.payment]}</span><span>{baht(r.received)}</span></div>
      {r.payment === 'cash' && <div className="ln"><span>เงินทอน</span><span>{baht(r.change)}</span></div>}
      <hr />
      <div>พนักงาน: {staff ? `${staff.title} ${staff.name}` : '-'}</div>
      {ph && <div>เภสัชกรผู้จ่ายยา: {ph.title} {ph.name} ({ph.license?.no})</div>}
      <hr />
      <div className="c">{s.receiptNote}</div>
    </div>
  )
}

export function DrugLabel({ item, receipt }) {
  const { state } = useStore()
  const cust = state.customers.find((c) => c.id === receipt.customerId)
  const ph = state.staff.find((x) => x.id === receipt.pharmacistId)
  return (
    <div className="drug-label">
      <div className="ln" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem' }}><b>{state.settings.shopName}</b><span>{thDate(receipt.at)}</span></div>
      <div className="dn">{item.name}</div>
      <div>ผู้ป่วย: {cust?.name || '................................'}</div>
      <div>จำนวน: {item.qty} {item.unit} · Lot {item.lots.map((l) => l.lotNo).join(', ')} · Exp {item.lots[0] ? thDate(item.lots[0].exp) : '-'}</div>
      <div style={{ margin: '6px 0', fontWeight: 600 }}>{item.dosage || 'ตามคำแนะนำของเภสัชกร'}</div>
      <div style={{ fontSize: '.7rem' }}>{ph ? `เภสัชกร ${ph.title} ${ph.name} (${ph.license?.no})` : ''} · โทร {state.settings.phone}</div>
    </div>
  )
}
