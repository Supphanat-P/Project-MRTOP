import { useState } from 'react'
import { useStore } from '../store.jsx'
import { ALLERGY_GROUPS, allergenLabel } from '../utils.js'
import { Field, Modal } from './ui.jsx'

export default function MemberForm({ initial, onClose, onSave, busy }) {
  const { state } = useStore()
  const [m, setM] = useState({ ...initial, allergens: initial.allergens || [] })
  const [pick, setPick] = useState('')
  const options = [...Object.keys(ALLERGY_GROUPS), ...new Set(state.products.map((p) => p.generic).filter((g) => g && g !== '-'))]
    .filter((o) => !m.allergens.includes(o))
  const addAllergen = (v) => {
    const a = String(v || '').trim().slice(0, 60)
    if (!a) return
    const known = Object.keys(ALLERGY_GROUPS).find((g) => g.toLowerCase() === a.toLowerCase()) || a
    if (!m.allergens.some((x) => x.toLowerCase() === known.toLowerCase())) setM({ ...m, allergens: [...m.allergens, known] })
    setPick('')
  }
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
        <Field label="ยาที่แพ้" className="span2" hint="ระบบจะไม่ให้ขายยาที่ตรงกับรายการนี้ให้ลูกค้าคนนี้ · เลือกกลุ่มยาเพื่อกันยาทั้งกลุ่ม">
          <div className="chips">
            {m.allergens.map((a) => (
              <span key={a} className="chip danger">{allergenLabel(a)}<button type="button" aria-label={`ลบ ${a}`} onClick={() => setM({ ...m, allergens: m.allergens.filter((x) => x !== a) })}>×</button></span>
            ))}
            {!m.allergens.length && <span className="muted small">ยังไม่ได้เลือก</span>}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <select value="" onChange={(e) => addAllergen(e.target.value)} style={{ flex: 1 }}>
              <option value="">เลือกยา / กลุ่มยาที่แพ้</option>
              <optgroup label="กลุ่มยา">{Object.keys(ALLERGY_GROUPS).filter((g) => options.includes(g)).map((g) => <option key={g} value={g}>{allergenLabel(g)}</option>)}</optgroup>
              <optgroup label="ชื่อสามัญของยาในร้าน">{options.filter((o) => !ALLERGY_GROUPS[o]).sort().map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>
            </select>
            <input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="หรือพิมพ์ชื่อยาอื่น" style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergen(pick) } }} />
            <button type="button" className="btn sm" onClick={() => addAllergen(pick)}>เพิ่ม</button>
          </div>
        </Field>
        <Field label="อาการ / รายละเอียดการแพ้" className="span2"><input value={m.allergies} onChange={set('allergies')} placeholder="เช่น ผื่นขึ้น หายใจลำบาก" /></Field>
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
