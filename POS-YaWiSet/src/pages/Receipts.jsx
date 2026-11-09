import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, downloadCSV, thDate, today } from '../utils.js'
import { Badge, Empty, Modal } from '../components/ui.jsx'
import ReceiptView from '../components/ReceiptView.jsx'

export default function Receipts() {
  const { state, dispatch, me } = useStore()
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)

  const rows = useMemo(() => state.receipts.filter((r) => {
    const d = r.at.slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    if (q && !r.no.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }).reverse(), [state.receipts, from, to, q])

  const valid = rows.filter((r) => !r.voided)
  const sum = valid.reduce((s, r) => s + r.total, 0)
  const name = (id) => { const s = state.staff.find((x) => x.id === id); return s ? `${s.title} ${s.name}` : '-' }
  const cust = (id) => state.customers.find((c) => c.id === id)?.name || 'ลูกค้าทั่วไป'
  const viewing = state.receipts.find((r) => r.id === view)

  const voidIt = (r) => {
    const reason = prompt(`ยกเลิกบิล ${r.no} และคืนสินค้าเข้าสต็อก\nระบุเหตุผล:`)
    if (!reason) return
    dispatch({ type: 'VOID_RECEIPT', id: r.id, reason, at: new Date().toISOString(), staffId: me.id })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>🧾 ใบเสร็จ & ประวัติการขาย</h2>
        <button className="btn" onClick={() => downloadCSV(`sales-${from}_${to}.csv`, [
          ['เลขที่', 'วันที่', 'ลูกค้า', 'สินค้า', 'ยอดสุทธิ', 'ชำระโดย', 'พนักงาน', 'เภสัชกร', 'สถานะ'],
          ...rows.map((r) => [r.no, r.at, cust(r.customerId), r.items.map((i) => `${i.name}x${i.qty}`).join('; '), r.total, r.payment, name(r.staffId), name(r.pharmacistId), r.voided ? 'ยกเลิก' : 'ปกติ']),
        ])}>⬇️ ส่งออก CSV</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <label className="inline">ตั้งแต่ <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="inline">ถึง <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <input className="search" placeholder="เลขที่ใบเสร็จ" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="muted">{valid.length} บิล · รวม <b>{baht(sum)}</b></span>
        </div>
        {!rows.length ? <Empty>ยังไม่มีใบเสร็จในช่วงนี้ — ไปที่หน้า “ขายหน้าร้าน” เพื่อเริ่มขาย</Empty> : (
          <table className="tbl">
            <thead><tr><th>เลขที่</th><th>วันเวลา</th><th>ลูกค้า</th><th className="r">รายการ</th><th className="r">ยอดสุทธิ</th><th>ชำระ</th><th>เภสัชกร</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.voided ? 'voided' : ''}>
                  <td className="mono">{r.no} {r.voided && <Badge cls="danger">ยกเลิก</Badge>}</td>
                  <td>{thDate(r.at, true)}</td>
                  <td>{cust(r.customerId)}</td>
                  <td className="r">{r.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td className="r"><b>{baht(r.total)}</b></td>
                  <td>{{ cash: 'เงินสด', qr: 'QR', card: 'บัตร' }[r.payment]}</td>
                  <td>{r.pharmacistId ? name(r.pharmacistId) : '-'}</td>
                  <td className="r nowrap">
                    <button className="btn sm" onClick={() => setView(r.id)}>ดู/พิมพ์</button>
                    {!r.voided && me.role !== 'cashier' && <button className="btn sm danger-outline" onClick={() => voidIt(r)}>ยกเลิก</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {viewing && (
        <Modal title={'ใบเสร็จ ' + viewing.no} onClose={() => setView(null)}
          footer={<button className="btn primary" onClick={() => window.print()}>🖨️ พิมพ์ใบเสร็จ</button>}>
          <ReceiptView receipt={viewing} />
        </Modal>
      )}
    </div>
  )
}
