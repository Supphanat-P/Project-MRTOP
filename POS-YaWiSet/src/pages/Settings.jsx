import { useState } from 'react'
import { useStore } from '../store.jsx'
import { today, uid } from '../utils.js'
import { Field } from '../components/ui.jsx'

export default function Settings() {
  const { state, dispatch } = useStore()
  const [s, setS] = useState(state.settings)
  const [c, setC] = useState({ name: '', phone: '', allergies: '' })
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })

  const backup = () => {
    const blob = new Blob([JSON.stringify({ ...state, session: null }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yawiset-backup-${today()}.json`; a.click()
  }
  const restore = (e) => {
    const file = e.target.files[0]; if (!file) return
    file.text().then((t) => { try { dispatch({ type: 'IMPORT', data: JSON.parse(t) }); alert('กู้คืนข้อมูลสำเร็จ') } catch { alert('ไฟล์ไม่ถูกต้อง') } })
  }

  return (
    <div className="page">
      <div className="page-head"><h2>⚙️ ตั้งค่าร้าน & ลูกค้า</h2></div>
      <div className="grid-dash">
        <div className="card">
          <h3>ข้อมูลร้าน (แสดงบนใบเสร็จ)</h3>
          <Field label="ชื่อร้าน"><input value={s.shopName} onChange={set('shopName')} /></Field>
          <Field label="ที่อยู่"><textarea rows="2" value={s.address} onChange={set('address')} /></Field>
          <div className="grid2">
            <Field label="โทรศัพท์"><input value={s.phone} onChange={set('phone')} /></Field>
            <Field label="เลขผู้เสียภาษี"><input value={s.taxId} onChange={set('taxId')} /></Field>
            <Field label="เลขที่ใบอนุญาตร้าน (ข.ย.)"><input value={s.licenseShop} onChange={set('licenseShop')} /></Field>
            <Field label="พร้อมเพย์"><input value={s.promptPay} onChange={set('promptPay')} /></Field>
          </div>
          <button className="btn primary" onClick={() => { dispatch({ type: 'SAVE_SETTINGS', settings: s }); alert('บันทึกแล้ว') }}>บันทึก</button>
        </div>
        <div className="card">
          <h3>ลูกค้า / ประวัติแพ้ยา</h3>
          <table className="tbl compact"><tbody>
            {state.customers.map((x) => <tr key={x.id}><td>{x.name}<div className="muted small">{x.phone}</div></td><td className={x.allergies ? 'txt-danger' : 'muted'}>{x.allergies || '—'}</td></tr>)}
          </tbody></table>
          <div className="grid2 mt">
            <Field label="ชื่อ"><input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="โทร"><input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
          </div>
          <Field label="ประวัติแพ้ยา"><input value={c.allergies} onChange={(e) => setC({ ...c, allergies: e.target.value })} /></Field>
          <button className="btn" onClick={() => { if (!c.name) return; dispatch({ type: 'SAVE_CUSTOMER', customer: { ...c, id: uid() } }); setC({ name: '', phone: '', allergies: '' }) }}>＋ เพิ่มลูกค้า</button>
        </div>
        <div className="card">
          <h3>สำรอง / กู้คืนข้อมูล</h3>
          <p className="muted small">ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ (localStorage) — ควรสำรองเป็นไฟล์สม่ำเสมอ</p>
          <div className="row gap">
            <button className="btn" onClick={backup}>⬇️ สำรองข้อมูล (.json)</button>
            <label className="btn">⬆️ กู้คืน<input type="file" accept=".json" hidden onChange={restore} /></label>
            <button className="btn danger-outline" onClick={() => confirm('ล้างข้อมูลทั้งหมดกลับเป็นข้อมูลตัวอย่าง?') && dispatch({ type: 'RESET' })}>รีเซ็ตข้อมูลตัวอย่าง</button>
          </div>
        </div>
      </div>
    </div>
  )
}
