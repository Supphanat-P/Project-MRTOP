import { useState } from 'react'
import { useStore } from '../store.jsx'
import { licenseStatus, ROLE_LABEL, thDate, uid } from '../utils.js'
import { Badge, Field, Modal } from '../components/ui.jsx'
import LicenseCard from '../components/LicenseCard.jsx'

const COLORS = ['#0f766e', '#7c3aed', '#ea580c', '#2563eb', '#db2777', '#65a30d']

export default function Staff() {
  const { state, dispatch, me } = useStore()
  const [edit, setEdit] = useState(null)
  const [show, setShow] = useState(null)
  const isAdmin = me.role === 'admin'
  const pharm = state.staff.filter((s) => s.license)
  const others = state.staff.filter((s) => !s.license)
  const showing = state.staff.find((s) => s.id === show)

  return (
    <div className="page">
      <div className="page-head">
        <h2>👩‍⚕️ เภสัชกร & พนักงาน</h2>
        {isAdmin && <button className="btn primary" onClick={() => setEdit({ id: '', name: '', title: 'ภก.', role: 'pharmacist', pin: '', color: COLORS[state.staff.length % COLORS.length], license: { no: '', type: 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม', issued: '', expires: '', university: '', idCard: '' } })}>＋ เพิ่มพนักงาน</button>}
      </div>

      <div className="alert info">
        📄 การ์ดใบประกอบวิชาชีพด้านล่างเป็น <b>เอกสารจำลอง</b> ที่ระบบสร้างจากข้อมูลที่กรอก ใช้สำหรับยืนยันตัวเภสัชกรในระบบ (เช่น ผูกกับการขายยาอันตราย/ใบเสร็จ/ขย.) ไม่ใช่สำเนาใบอนุญาตจริง — ที่ร้านต้องแสดงใบอนุญาตตัวจริงตามข้อกำหนด GPP
      </div>

      <h3 className="section-title">เภสัชกรประจำร้าน ({pharm.length})</h3>
      <div className="lic-grid">
        {pharm.map((s) => {
          const st = licenseStatus(s.license)
          return (
            <div key={s.id} className="card staff-card">
              <LicenseCard staff={s} shop={state.settings} />
              <div className="row gap mt">
                <Badge cls="muted">{ROLE_LABEL[s.role]}</Badge>
                {st.key !== 'ok' && <Badge cls={st.cls}>{st.key === 'expired' ? 'ห้ามจ่ายยาอันตราย' : 'แจ้งต่ออายุ'}</Badge>}
                <span className="spacer" />
                <button className="btn sm" onClick={() => setShow(s.id)}>🖨️ พิมพ์การ์ด</button>
                {isAdmin && <button className="btn sm" onClick={() => setEdit(JSON.parse(JSON.stringify(s)))}>แก้ไข</button>}
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="section-title">พนักงานขาย ({others.length})</h3>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>สิทธิ์</th><th></th></tr></thead>
          <tbody>{others.map((s) => (
            <tr key={s.id}><td><span className="avatar sm" style={{ background: s.color }}>{s.name[0]}</span> {s.title} {s.name}</td><td>{ROLE_LABEL[s.role]}</td>
              <td className="muted small">ขายยาสามัญ/สินค้าทั่วไป, ดูใบเสร็จ · ไม่สามารถจ่ายยาอันตรายได้</td>
              <td className="r">{isAdmin && <button className="btn sm" onClick={() => setEdit(JSON.parse(JSON.stringify(s)))}>แก้ไข</button>}</td></tr>
          ))}</tbody>
        </table>
      </div>

      {showing && (
        <Modal title="พิมพ์การ์ดข้อมูลใบอนุญาต (จำลอง)" wide onClose={() => setShow(null)} footer={<button className="btn primary" onClick={() => window.print()}>🖨️ พิมพ์</button>}>
          <div className="print-area"><LicenseCard staff={showing} shop={state.settings} /></div>
        </Modal>
      )}
      {edit && <StaffForm initial={edit} onClose={() => setEdit(null)}
        onSave={(s) => { dispatch({ type: 'SAVE_STAFF', staff: s }); setEdit(null) }}
        onDelete={edit.id && edit.id !== me.id ? () => { if (confirm('ลบพนักงานนี้?')) { dispatch({ type: 'DELETE_STAFF', id: edit.id }); setEdit(null) } } : null} />}
    </div>
  )
}

function StaffForm({ initial, onClose, onSave, onDelete }) {
  const [s, setS] = useState({ ...initial, license: initial.license || { no: '', type: 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม', issued: '', expires: '', university: '', idCard: '' } })
  const isPh = s.role !== 'cashier'
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const setL = (k) => (e) => setS({ ...s, license: { ...s.license, [k]: e.target.value } })
  const save = () => {
    if (!s.name.trim() || !/^\d{4}$/.test(s.pin)) return alert('กรอกชื่อ และ PIN 4 หลัก')
    if (isPh && (!s.license.no || !s.license.expires)) return alert('เภสัชกรต้องมีเลขที่ใบอนุญาตและวันหมดอายุ')
    onSave({ ...s, id: s.id || uid(), license: isPh ? s.license : null })
  }
  return (
    <Modal title={s.id ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'} onClose={onClose}
      footer={<>{onDelete && <button className="btn danger-outline" onClick={onDelete}>ลบ</button>}<span className="spacer" /><button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={save}>บันทึก</button></>}>
      <div className="grid2">
        <Field label="คำนำหน้า"><select value={s.title} onChange={set('title')}>{['ภก.', 'ภญ.', 'นาย', 'นาง', 'นางสาว'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="ชื่อ-สกุล *"><input value={s.name} onChange={set('name')} /></Field>
        <Field label="บทบาท"><select value={s.role} onChange={set('role')}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="PIN เข้าระบบ (4 หลัก) *"><input value={s.pin} maxLength={4} onChange={set('pin')} /></Field>
      </div>
      {isPh && (
        <fieldset className="fs">
          <legend>ข้อมูลใบอนุญาตประกอบวิชาชีพ</legend>
          <div className="grid2">
            <Field label="เลขที่ใบอนุญาต *"><input value={s.license.no} placeholder="ภ.xxxxx" onChange={setL('no')} /></Field>
            <Field label="สถาบันที่สำเร็จการศึกษา"><input value={s.license.university} onChange={setL('university')} /></Field>
            <Field label="วันออกใบอนุญาต"><input type="date" value={s.license.issued} onChange={setL('issued')} /></Field>
            <Field label="วันหมดอายุ *"><input type="date" value={s.license.expires} onChange={setL('expires')} /></Field>
          </div>
          <div className="muted small">หมดอายุ: {thDate(s.license.expires)} — ระบบจะเตือนล่วงหน้า 60 วัน และบล็อกการจ่ายยาอันตรายเมื่อหมดอายุ</div>
        </fieldset>
      )}
    </Modal>
  )
}
