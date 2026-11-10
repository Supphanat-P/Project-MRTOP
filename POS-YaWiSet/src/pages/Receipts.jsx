import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, downloadCSV, localDay, PAY_LABEL, printModal, thDate, today } from '../utils.js'
import { Badge, Field, Modal, PageHead, Stat } from '../components/ui.jsx'
import ReceiptView, { DrugLabel } from '../components/ReceiptView.jsx'

export default function Receipts() {
  const { state, act, me } = useStore()
  const canVoid = me.role !== 'cashier'
  const [from, setFrom] = useState(today(-30))
  const [to, setTo] = useState(today())
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)
  const [mode, setMode] = useState('receipt')
  const [voiding, setVoiding] = useState(null)

  const name = (id) => { const s = state.staff.find((x) => x.id === id); return s ? `${s.title} ${s.name}` : '-' }
  const cust = (id) => state.customers.find((c) => c.id === id)?.name || 'ลูกค้าทั่วไป'

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return state.receipts.filter((r) => {
      const d = localDay(r.at)
      if (d < from || d > to) return false
      return !k || r.no.toLowerCase().includes(k) || cust(r.customerId).toLowerCase().includes(k) || r.items.some((i) => i.name.toLowerCase().includes(k))
    }).reverse()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.receipts, state.customers, from, to, q])

  const valid = rows.filter((r) => !r.voided)
  const sum = valid.reduce((s, r) => s + r.total, 0)
  const viewing = state.receipts.find((r) => r.id === view)

  const exportCSV = () => downloadCSV(`sales-${from}_${to}.csv`, [
    ['เลขที่', 'วันที่', 'ลูกค้า', 'สินค้า', 'ยอดสุทธิ', 'ชำระโดย', 'พนักงาน', 'เภสัชกร', 'สถานะ'],
    ...rows.map((r) => [r.no, thDate(r.at, true), cust(r.customerId), r.items.map((i) => `${i.name} x${i.qty}`).join('; '), r.total, PAY_LABEL[r.payment], name(r.staffId), name(r.pharmacistId), r.voided ? 'ยกเลิก' : 'ปกติ']),
  ])

  return (
    <div className="page">
      <PageHead label="Receipts" title="ใบเสร็จ &" em="ประวัติการขาย" sub="ค้นหา พิมพ์ใบเสร็จ/ฉลากยาย้อนหลัง และยกเลิกบิล (คืนสต็อกเข้า Lot เดิมอัตโนมัติ)">
        <button className="btn" onClick={exportCSV}>⬇ CSV</button>
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="ยอดขายสุทธิในช่วง" value={baht(sum)} change={`${valid.length} บิล`} />
        <Stat label="เฉลี่ยต่อบิล" value={baht(valid.length ? sum / valid.length : 0)} />
        <Stat label="เงินสด / โอน / บัตร" value={['cash', 'qr', 'card'].map((p) => valid.filter((r) => r.payment === p).length).join(' / ')} change="จำนวนบิล" />
        <Stat label="บิลที่ยกเลิก" value={rows.length - valid.length} />
      </div>

      <div className="card flush">
        <div className="row" style={{ padding: 16 }}>
          <div className="search"><input placeholder="ค้นหาเลขที่ / ลูกค้า / ชื่อยา" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="row small">ตั้งแต่ <input type="date" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="row small">ถึง <input type="date" style={{ width: 160 }} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>เลขที่</th><th>วันที่</th><th>ลูกค้า</th><th>รายการ</th><th className="right">ยอดสุทธิ</th><th>ชำระ</th><th>พนักงาน</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.voided ? 'voided' : ''}>
                  <td className="mono nowrap"><b>{r.no}</b></td>
                  <td className="nowrap">{thDate(r.at, true)}</td>
                  <td>{cust(r.customerId)}</td>
                  <td><small>{r.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</small></td>
                  <td className="right nowrap"><b>{baht(r.total)}</b></td>
                  <td><Badge cls="muted">{PAY_LABEL[r.payment]}</Badge></td>
                  <td><small>{name(r.staffId)}{r.pharmacistId && <><br />เภสัชกร: {name(r.pharmacistId)}</>}</small></td>
                  <td className="right nowrap" style={{ textDecoration: 'none' }}>
                    <button className="btn sm" onClick={() => { setView(r.id); setMode('receipt') }}>ดู / พิมพ์</button>
                    {canVoid && !r.voided && <button className="btn sm danger" onClick={() => setVoiding({ r, reason: '' })}>ยกเลิก</button>}
                    {r.voided && <Badge cls="danger">ยกเลิกแล้ว</Badge>}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">ไม่มีใบเสร็จในช่วงนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal title={`ใบเสร็จ ${viewing.no}`} onClose={() => setView(null)}
          footer={<>
            <div className="seg left">
              <button className={mode === 'receipt' ? 'on' : ''} onClick={() => setMode('receipt')}>ใบเสร็จ</button>
              <button className={mode === 'label' ? 'on' : ''} onClick={() => setMode('label')}>ฉลากยา</button>
            </div>
            <button className="btn primary" onClick={printModal}>🖨 พิมพ์</button>
          </>}>
          {mode === 'receipt' ? <ReceiptView receipt={viewing} /> : viewing.items.map((it, i) => <DrugLabel key={i} item={it} receipt={viewing} />)}
        </Modal>
      )}

      {voiding && (
        <Modal title={`ยกเลิกบิล ${voiding.r.no}`} onClose={() => setVoiding(null)}
          footer={<><button className="btn" onClick={() => setVoiding(null)}>ไม่ยกเลิก</button>
            <button className="btn danger" onClick={async () => {
              if (!voiding.reason.trim()) return alert('กรุณาระบุเหตุผล')
              if (await act('voidReceipt', { id: voiding.r.id, reason: voiding.reason }, `ยกเลิกบิล ${voiding.r.no} และคืนสต็อกแล้ว`)) setVoiding(null)
            }}>ยืนยันยกเลิกบิล</button></>}>
          <p style={{ marginBottom: 12 }}>ยอด <b>{baht(voiding.r.total)}</b> · {voiding.r.items.length} รายการ — สินค้าจะถูกคืนเข้า Lot เดิม</p>
          <Field label="เหตุผล *"><input autoFocus value={voiding.reason} onChange={(e) => setVoiding({ ...voiding, reason: e.target.value })} placeholder="เช่น คีย์ผิด / ลูกค้าคืนสินค้า" /></Field>
        </Modal>
      )}
    </div>
  )
}
