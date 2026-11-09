import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { downloadCSV, thDate, today } from '../utils.js'
import { Empty } from '../components/ui.jsx'

// โปรดตรวจสอบชื่อ/รูปแบบแบบฟอร์มกับประกาศ อย. ฉบับล่าสุดก่อนใช้งานจริง
const FORMS = [
  { key: 'ขย.9', title: 'บัญชีการซื้อยา', partner: 'ผู้ขาย/บริษัท', ref: 'เลขที่ใบส่งของ' },
  { key: 'ขย.10', title: 'บัญชีการขายยาอันตราย', partner: 'ผู้ซื้อ', ref: 'เลขที่ใบเสร็จ' },
  { key: 'ขย.11', title: 'บัญชีการขายยาควบคุมพิเศษ', partner: 'ผู้ซื้อ', ref: 'เลขที่ใบเสร็จ' },
  { key: 'ขย.12', title: 'บัญชีการขายยาตามใบสั่งของผู้ประกอบวิชาชีพ', partner: 'ผู้ป่วย', ref: 'เลขที่ใบเสร็จ' },
  { key: 'adj', title: 'บันทึกการทำลาย/ตัดจำหน่าย/รับคืน', partner: 'ประเภท', ref: 'เหตุผล' },
]

export default function GPP() {
  const { state } = useStore()
  const [tab, setTab] = useState('ขย.9')
  const [month, setMonth] = useState(today().slice(0, 7))
  const f = FORMS.find((x) => x.key === tab)
  const name = (id) => { const s = state.staff.find((x) => x.id === id); return s ? `${s.title}${s.name}${s.license ? ` (${s.license.no})` : ''}` : '-' }

  const rows = useMemo(() => {
    const src = tab === 'adj'
      ? state.adjustments.map((a) => ({ ...a, partner: a.type, ref: a.reason }))
      : state.gpp.filter((g) => g.form === tab)
    return src.filter((r) => r.at.slice(0, 7) === month)
  }, [state.gpp, state.adjustments, tab, month])

  const exportIt = () => downloadCSV(`${tab}-${month}.csv`, [
    ['ลำดับ', 'วันที่', 'ชื่อยา', 'เลขที่ผลิต/Lot', 'จำนวน', 'หน่วย', f.partner, f.ref, ...(tab === 'ขย.12' ? ['เลขที่ใบสั่ง', 'ผู้สั่งจ่าย'] : []), 'ผู้บันทึก/เภสัชกร'],
    ...rows.map((r, i) => [i + 1, thDate(r.at), r.name, r.lotNo, r.qty, r.unit || '', r.partner, r.ref, ...(tab === 'ขย.12' ? [r.rxNo, r.prescriber] : []), name(r.staffId)]),
  ])

  return (
    <div className="page">
      <div className="page-head">
        <h2>📋 รายงาน GPP (ขย.)</h2>
        <div className="row gap">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="btn" onClick={exportIt}>⬇️ CSV / Excel</button>
          <button className="btn primary" onClick={() => window.print()}>🖨️ พิมพ์</button>
        </div>
      </div>
      <div className="tabs no-print">
        {FORMS.map((x) => <button key={x.key} className={tab === x.key ? 'active' : ''} onClick={() => setTab(x.key)}>{x.key === 'adj' ? 'ทำลาย/คืน' : x.key}</button>)}
      </div>
      <div className="card print-area">
        <div className="gpp-head">
          <div><b>{tab !== 'adj' && tab} {f.title}</b></div>
          <div className="muted small">{state.settings.shopName} · {state.settings.licenseShop} · ประจำเดือน {thDate(month + '-01').split(' ').slice(1).join(' ')}</div>
        </div>
        {!rows.length ? <Empty>ยังไม่มีรายการ — ระบบบันทึกอัตโนมัติเมื่อรับยาเข้า/ขายยา</Empty> : (
          <table className="tbl">
            <thead><tr><th>#</th><th>วันที่</th><th>ชื่อยา</th><th>Lot</th><th className="r">จำนวน</th><th>{f.partner}</th><th>{f.ref}</th>{tab === 'ขย.12' && <><th>ใบสั่ง</th><th>ผู้สั่งจ่าย</th></>}<th>ผู้บันทึก</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{thDate(r.at)}</td><td>{r.name}</td><td className="mono">{r.lotNo}</td><td className="r">{r.qty} {r.unit}</td>
                <td>{r.partner}</td><td>{r.ref}</td>{tab === 'ขย.12' && <><td>{r.rxNo}</td><td>{r.prescriber}</td></>}<td>{name(r.staffId)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <p className="muted small no-print">* ชื่อแบบฟอร์มอ้างอิงตามแนวทาง GPP ร้านขายยาแผนปัจจุบัน (ข.ย.1) — ควรตรวจสอบรูปแบบกับประกาศ อย. ล่าสุดก่อนยื่นจริง</p>
    </div>
  )
}
