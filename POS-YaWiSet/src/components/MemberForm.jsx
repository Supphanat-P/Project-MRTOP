import { useState } from 'react'
import { Field, Modal } from './ui.jsx'

export default function MemberForm({ initial, onClose, onSave, busy }) {
  const [m, setM] = useState(initial)
  const isNew = !m.id
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value })
  const save = () => {
    if (!m.name.trim()) return alert('กรุณากรอกชื่อ')
    if (!/^0\d{8,9}$/.test(m.phone.replace(/\D/g, ''))) return alert('เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0')
    if (isNew && !m.consent) return alert('ต้องได้รับความยินยอมจากลูกค้าก่อนสมัครสมาชิก')
    onSave(m)
  }
  return (
    <Modal title={isNew ? 'สมัครสมาชิก' : `แก้ไขสมาชิก ${m.memberNo}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" disabled={busy} onClick={save}>{isNew ? 'สมัครสมาชิก' : 'บันทึก'}</button></>}>
      <div className="form-grid">
        <Field label="ชื่อ-สกุล *"><input value={m.name} onChange={set('name')} autoFocus={!m.name} /></Field>
        <Field label="เบอร์โทร *"><input inputMode="tel" value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value.replace(/[^\d-]/g, '') })} placeholder="0812345678" /></Field>
        <Field label="วันเกิด"><input type="date" value={m.birthDate || ''} onChange={set('birthDate')} /></Field>
        <Field label="หมายเหตุ"><input value={m.note} onChange={set('note')} placeholder="เช่น โรคประจำตัว ยาที่ใช้ประจำ" /></Field>
        <Field label="ประวัติแพ้ยา" className="span2"><input value={m.allergies} onChange={set('allergies')} placeholder="เช่น แพ้ Penicillin, Sulfa" /></Field>
      </div>
      {isNew && (
        <label className="check" style={{ marginTop: 16 }}>
          <input type="checkbox" checked={m.consent} onChange={(e) => setM({ ...m, consent: e.target.checked })} />
          <span>ลูกค้ายินยอมให้ร้านเก็บชื่อ เบอร์โทร และประวัติการแพ้ยา/การซื้อยา เพื่อใช้ดูแลการจ่ายยาและบริการสมาชิกเท่านั้น *</span>
        </label>
      )}
    </Modal>
  )
}
