import { useState } from 'react'
import { useStore } from '../store.jsx'
import { today } from '../utils.js'
import { Field, PageHead } from '../components/ui.jsx'
import ReceiptView from '../components/ReceiptView.jsx'

export default function Settings() {
  const { state, act, me } = useStore()
  const isAdmin = me.role === 'admin'
  const [s, setS] = useState(state.settings)
  const [c, setC] = useState({ id: '', name: '', phone: '', allergies: '' })
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yawiset-export-${today()}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }
  const sample = {
    no: 'R000000-0001', at: new Date().toISOString(), customerId: 'c1', staffId: me.id, pharmacistId: me.license ? me.id : null,
    items: [{ name: 'ตัวอย่างสินค้า', qty: 2, unit: 'แผง', price: 15 }], subtotal: 30, discount: 0, total: 30, payment: 'cash', received: 50, change: 20,
  }

  return (
    <div className="page">
      <PageHead label="Shop" title="ข้อมูล" em="ร้านค้า" sub="ข้อมูลบนใบเสร็จ ลูกค้าและประวัติแพ้ยา และการสำรองข้อมูล" />

      <div className="grid two">
        <div className="card">
          <h3>ข้อมูลร้าน (แสดงบนใบเสร็จ)</h3>
          {!isAdmin && <div className="alert warn" style={{ marginBottom: 14 }}>เฉพาะผู้ดูแลระบบแก้ไขได้</div>}
          <fieldset disabled={!isAdmin} style={{ border: 'none' }}>
            <div className="form-grid">
              <Field label="ชื่อร้าน *" className="span2"><input value={s.shopName || ''} onChange={set('shopName')} /></Field>
              <Field label="ที่อยู่" className="span2"><input value={s.address || ''} onChange={set('address')} /></Field>
              <Field label="โทรศัพท์"><input value={s.phone || ''} onChange={set('phone')} /></Field>
              <Field label="เลขประจำตัวผู้เสียภาษี"><input value={s.taxId || ''} onChange={set('taxId')} /></Field>
              <Field label="เลขที่ใบอนุญาตขายยา"><input value={s.licenseShop || ''} onChange={set('licenseShop')} /></Field>
              <Field label="พร้อมเพย์"><input value={s.promptPay || ''} onChange={set('promptPay')} /></Field>
              <Field label="ข้อความท้ายใบเสร็จ" className="span2"><input value={s.receiptNote || ''} onChange={set('receiptNote')} /></Field>
            </div>
            {isAdmin && <button className="btn primary" style={{ marginTop: 16 }} onClick={() => act('saveSettings', s, 'บันทึกข้อมูลร้านแล้ว')}>บันทึก</button>}
          </fieldset>
        </div>

        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">ตัวอย่างใบเสร็จ</span></div>
          <div className="window-body" style={{ background: 'var(--surface)' }}>
            <ReceiptView receipt={{ ...sample }} />
          </div>
        </div>

        <div className="card">
          <h3>ลูกค้า / ประวัติแพ้ยา</h3>
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
            <table>
              <thead><tr><th>ชื่อ</th><th>โทร</th><th>แพ้ยา</th><th></th></tr></thead>
              <tbody>{state.customers.map((x) => (
                <tr key={x.id}><td>{x.name}</td><td>{x.phone || '-'}</td><td style={{ color: x.allergies ? 'var(--danger)' : undefined }}>{x.allergies || '-'}</td>
                  <td className="right"><button className="btn sm ghost" onClick={() => setC({ ...x, phone: x.phone || '', allergies: x.allergies || '' })}>แก้ไข</button></td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="form-grid">
            <Field label={c.id ? 'แก้ไขชื่อลูกค้า' : 'ชื่อลูกค้าใหม่'}><input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="โทร"><input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
            <Field label="ประวัติแพ้ยา" className="span2"><input value={c.allergies} onChange={(e) => setC({ ...c, allergies: e.target.value })} placeholder="เช่น แพ้ Penicillin, Sulfa" /></Field>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={async () => { if (await act('saveCustomer', c, c.id ? 'แก้ไขลูกค้าแล้ว' : 'เพิ่มลูกค้าแล้ว')) setC({ id: '', name: '', phone: '', allergies: '' }) }}>
              {c.id ? 'บันทึกการแก้ไข' : '＋ เพิ่มลูกค้า'}</button>
            {c.id && <button className="btn" onClick={() => setC({ id: '', name: '', phone: '', allergies: '' })}>ยกเลิก</button>}
          </div>
        </div>

        <div className="card">
          <h3>ฐานข้อมูล & การสำรองข้อมูล</h3>
          <p className="muted small" style={{ lineHeight: 1.7 }}>
            ข้อมูลทั้งหมดเก็บใน MySQL ฐานข้อมูล <code>yawiset_pos</code> - เปิดดู/แก้ได้ใน MySQL Workbench
            (ลองคำสั่ง <code>SELECT * FROM v_stock;</code>) สำรองข้อมูลด้วยเมนู <b>Server → Data Export</b> และกู้คืนด้วย <b>Data Import</b>
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={exportJSON}>ส่งออก JSON</button>
            {isAdmin && <button className="btn danger" onClick={() => confirm('ล้างข้อมูลทั้งหมดในฐานข้อมูล แล้วใส่ข้อมูลตัวอย่างใหม่?\nทุกคนจะถูกออกจากระบบ และย้อนกลับไม่ได้') && act('reset')}>รีเซ็ตเป็นข้อมูลตัวอย่าง</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
