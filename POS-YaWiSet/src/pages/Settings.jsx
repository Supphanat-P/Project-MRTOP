import { useState } from 'react'
import { useStore } from '../store.jsx'
import { today } from '../utils.js'
import { Field, PageHead } from '../components/ui.jsx'
import ReceiptView from '../components/ReceiptView.jsx'

export default function Settings() {
  const { state, act, me } = useStore()
  const isAdmin = me.role === 'admin'
  const [s, setS] = useState(state.settings)
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
      <PageHead label="Shop" title="ข้อมูล" em="ร้านค้า" sub="ข้อมูลบนใบเสร็จ และการสำรองข้อมูล" />

      <div className="grid two">
        <div className="card">
          <h3>ข้อมูลร้าน (แสดงบนใบเสร็จ)</h3>
          <fieldset style={{ border: 'none' }}>
            <div className="form-grid">
              <Field label="ชื่อร้าน *" className="span2"><input value={s.shopName || ''} onChange={set('shopName')} /></Field>
              <Field label="ที่อยู่" className="span2"><input value={s.address || ''} onChange={set('address')} /></Field>
              <Field label="โทรศัพท์"><input value={s.phone || ''} onChange={set('phone')} /></Field>
              <Field label="เลขประจำตัวผู้เสียภาษี"><input value={s.taxId || ''} onChange={set('taxId')} /></Field>
              <Field label="เลขที่ใบอนุญาตขายยา"><input value={s.licenseShop || ''} onChange={set('licenseShop')} /></Field>
              <Field label="พร้อมเพย์"><input value={s.promptPay || ''} onChange={set('promptPay')} /></Field>
              <Field label="ข้อความท้ายใบเสร็จ" className="span2"><input value={s.receiptNote || ''} onChange={set('receiptNote')} /></Field>
            </div>
            <button className="btn primary" style={{ marginTop: 16 }} onClick={() => act('saveSettings', s, 'บันทึกข้อมูลร้านแล้ว')}>บันทึก</button>
          </fieldset>
        </div>

        <div className="window">
          <div className="window-bar"><i /><i /><i /><span className="title">ตัวอย่างใบเสร็จ</span></div>
          <div className="window-body" style={{ background: 'var(--surface)' }}>
            <ReceiptView receipt={{ ...sample }} />
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
