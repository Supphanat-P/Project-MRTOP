import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { baht, downloadCSV, fmtPhone, matchMember, blankMember, memberStats, PAY_LABEL, thDate, today } from '../utils.js'
import { Badge, Modal, PageHead, Stat } from '../components/ui.jsx'
import MemberForm from '../components/MemberForm.jsx'

export default function Members() {
  const { state, act, busy } = useStore()
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [history, setHistory] = useState(null)

  const members = useMemo(() => state.customers.filter((c) => c.memberNo)
    .map((c) => ({ ...c, ...memberStats(state.receipts, c.id) })), [state.customers, state.receipts])
  const rows = q.trim() ? members.filter((c) => matchMember(c, q)) : members
  const month = today().slice(0, 7)
  const newThisMonth = members.filter((c) => c.createdAt && thisMonth(c.createdAt, month)).length
  const memberSales = members.reduce((s, c) => s + c.total, 0)

  const exportCSV = () => downloadCSV(`members-${today()}.csv`, [
    ['รหัสสมาชิก', 'ชื่อ', 'เบอร์โทร', 'วันเกิด', 'แพ้ยา', 'หมายเหตุ', 'ซื้อ (ครั้ง)', 'ยอดซื้อรวม', 'สมัครเมื่อ'],
    ...members.map((c) => [c.memberNo, c.name, fmtPhone(c.phone), c.birthDate || '', c.allergies, c.note, c.visits, c.total, thDate(c.createdAt)]),
  ])

  const viewing = history && members.find((c) => c.id === history)
  const viewReceipts = viewing ? state.receipts.filter((r) => r.customerId === viewing.id).slice().reverse() : []

  return (
    <div className="page">
      <PageHead label="Members" title="สมาชิก" em="ลูกค้า" sub="สมัครสมาชิก ค้นหาจากเบอร์โทรหรือชื่อ ดูประวัติการซื้อและการแพ้ยา">
        <button className="btn" onClick={exportCSV}>CSV</button>
        <button className="btn primary" onClick={() => setForm(blankMember())}>＋ สมัครสมาชิก</button>
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="สมาชิกทั้งหมด" value={members.length} />
        <Stat label="สมัครใหม่เดือนนี้" value={newThisMonth} />
        <Stat label="มีประวัติแพ้ยา" value={members.filter((c) => c.allergies).length} change="แจ้งเตือนในหน้าขาย" />
        <Stat label="ยอดซื้อจากสมาชิก" value={baht(memberSales)} />
      </div>

      <div className="card flush">
        <div className="row" style={{ padding: 16 }}>
          <div className="search"><input autoFocus placeholder="ค้นหาเบอร์โทร / ชื่อ / รหัสสมาชิก" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>รหัส</th><th>ชื่อ</th><th>เบอร์โทร</th><th>แพ้ยา</th><th className="right">ซื้อ</th><th className="right">ยอดรวม</th><th>ล่าสุด</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="mono nowrap"><b>{c.memberNo}</b></td>
                  <td>{c.name}{c.note && <><br /><small className="muted">{c.note}</small></>}</td>
                  <td className="nowrap">{fmtPhone(c.phone)}</td>
                  <td>{c.allergies ? <Badge cls="danger">{c.allergies}</Badge> : <span className="muted">-</span>}</td>
                  <td className="right">{c.visits}</td>
                  <td className="right nowrap">{baht(c.total)}</td>
                  <td className="nowrap">{c.last ? thDate(c.last) : '-'}</td>
                  <td className="right nowrap">
                    <button className="btn sm ghost" onClick={() => setHistory(c.id)}>ประวัติ</button>
                    <button className="btn sm" onClick={() => setForm({ ...c, consent: true })}>แก้ไข</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">{q.trim() ? 'ไม่พบสมาชิก' : 'ยังไม่มีสมาชิก'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal wide title={`ประวัติการซื้อ · ${viewing.name} (${viewing.memberNo})`} onClose={() => setHistory(null)}
          footer={<button className="btn" onClick={() => setHistory(null)}>ปิด</button>}>
          <div className="grid three" style={{ gap: 12, marginBottom: 16 }}>
            <div className="alert"><b>เบอร์โทร</b><br />{fmtPhone(viewing.phone)}</div>
            <div className="alert"><b>วันเกิด</b><br />{viewing.birthDate ? thDate(viewing.birthDate) : '-'}</div>
            <div className="alert"><b>สมัครเมื่อ</b><br />{thDate(viewing.createdAt)}</div>
          </div>
          {viewing.allergies && <div className="alert danger" style={{ marginBottom: 16 }}>ประวัติแพ้ยา: {viewing.allergies}</div>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>เลขที่</th><th>วันที่</th><th>รายการ</th><th className="right">ยอด</th><th>ชำระ</th></tr></thead>
              <tbody>
                {viewReceipts.map((r) => (
                  <tr key={r.id} className={r.voided ? 'voided' : ''}>
                    <td className="mono nowrap">{r.no}{r.voided && <><br /><Badge cls="danger">ยกเลิก</Badge></>}</td>
                    <td className="nowrap">{thDate(r.at, true)}</td>
                    <td><small>{r.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</small></td>
                    <td className="right nowrap">{baht(r.total)}</td>
                    <td>{PAY_LABEL[r.payment]}</td>
                  </tr>
                ))}
                {!viewReceipts.length && <tr><td colSpan={5} className="empty">ยังไม่มีประวัติการซื้อ</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {form && <MemberForm initial={form} busy={busy} onClose={() => setForm(null)}
        onSave={async (m) => { if (await act('saveCustomer', m, m.id ? 'บันทึกข้อมูลสมาชิกแล้ว' : 'สมัครสมาชิกแล้ว')) setForm(null) }} />}
    </div>
  )
}

const thisMonth = (iso, month) => new Date(iso).toLocaleDateString('sv-SE').slice(0, 7) === month
