import { useStore } from '../store.jsx'
import { baht, thDate } from '../utils.js'

const PAY = { cash: 'เงินสด', qr: 'QR พร้อมเพย์', card: 'บัตรเครดิต/เดบิต' }

export default function ReceiptView({ receipt: r }) {
  const { state } = useStore()
  const s = state.settings
  const cashier = state.staff.find((x) => x.id === r.staffId)
  const ph = state.staff.find((x) => x.id === r.pharmacistId)
  const cust = state.customers.find((x) => x.id === r.customerId)
  return (
    <div className="receipt print-area">
      {r.voided && <div className="void-stamp">ยกเลิก</div>}
      <div className="rc-center">
        <div className="rc-shop">💊 {s.shopName}</div>
        <div>{s.address}</div>
        <div>โทร {s.phone} · เลขผู้เสียภาษี {s.taxId}</div>
        <div>{s.licenseShop}</div>
        <div className="rc-title">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</div>
      </div>
      <div className="rc-row"><span>เลขที่</span><b>{r.no}</b></div>
      <div className="rc-row"><span>วันที่</span><span>{thDate(r.at, true)}</span></div>
      <div className="rc-row"><span>ลูกค้า</span><span>{cust?.name || 'ลูกค้าทั่วไป'}</span></div>
      {r.rxNo && <div className="rc-row"><span>ใบสั่งแพทย์</span><span>{r.rxNo} ({r.prescriber})</span></div>}
      <hr />
      {r.items.map((it, i) => (
        <div key={i} className="rc-item">
          <div className="rc-row"><span>{it.name}</span><span>{baht(it.price * it.qty)}</span></div>
          <div className="rc-sub">{it.qty} {it.unit} × {baht(it.price)} · Lot {it.lots.map((l) => l.lotNo).join(', ')}</div>
        </div>
      ))}
      <hr />
      <div className="rc-row"><span>รวม</span><span>{baht(r.subtotal)}</span></div>
      {r.discount > 0 && <div className="rc-row"><span>ส่วนลด</span><span>-{baht(r.discount)}</span></div>}
      <div className="rc-row rc-total"><span>ยอดสุทธิ</span><span>{baht(r.total)}</span></div>
      <div className="rc-row"><span>ชำระโดย</span><span>{PAY[r.payment]}</span></div>
      {r.payment === 'cash' && <>
        <div className="rc-row"><span>รับเงิน</span><span>{baht(r.received)}</span></div>
        <div className="rc-row"><span>เงินทอน</span><span>{baht(r.change)}</span></div>
      </>}
      <hr />
      <div className="rc-row"><span>พนักงานขาย</span><span>{cashier ? `${cashier.title} ${cashier.name}` : '-'}</span></div>
      {ph && <div className="rc-row"><span>เภสัชกรผู้จ่ายยา</span><span>{ph.title} {ph.name} ({ph.license?.no})</span></div>}
      <div className="rc-center rc-thanks">ขอบคุณที่ใช้บริการ ขอให้หายป่วยไว ๆ 🙏</div>
    </div>
  )
}

export function DrugLabel({ item, receipt }) {
  const { state } = useStore()
  const cust = state.customers.find((x) => x.id === receipt.customerId)
  const ph = state.staff.find((x) => x.id === receipt.pharmacistId)
  return (
    <div className="drug-label">
      <div className="dl-shop">{state.settings.shopName} · {state.settings.phone}</div>
      <div className="dl-name">{item.name}</div>
      <div>ผู้ป่วย: {cust?.name || '................'} · จำนวน {item.qty} {item.unit}</div>
      <div className="dl-dose">{item.dosage || 'ใช้ตามคำแนะนำของเภสัชกร'}</div>
      <div className="dl-meta">Lot {item.lots.map((l) => l.lotNo).join(', ')} · EXP {item.lots.map((l) => thDate(l.exp)).join(', ')} · {thDate(receipt.at)}{ph ? ` · ${ph.title}${ph.name}` : ''}</div>
    </div>
  )
}
