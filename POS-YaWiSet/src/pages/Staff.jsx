import { useState } from 'react'
import { useStore } from '../store.jsx'
import { licenseStatus, printModal, ROLE_LABEL, thDate, today, uid } from '../utils.js'
import { Avatar, Badge, Field, Modal, PageHead, Stat } from '../components/ui.jsx'
import LicenseDoc from '../components/LicenseDoc.jsx'

const COLORS = ['#1A7A6E', '#2A9D8F', '#7c3aed', '#ea580c', '#0369a1', '#be185d', '#4d7c0f']
const LIC_TYPE = 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม'

export default function Staff() {
  const { state, act, me } = useStore()
  const isAdmin = me.role === 'admin'
  const [doc, setDoc] = useState(null)
  const [edit, setEdit] = useState(null)
  const pharm = state.staff.filter((s) => s.license)
  const viewing = state.staff.find((s) => s.id === doc)

  const blank = () => ({ id: '', title: 'ภก.', name: '', role: 'pharmacist', pin: '', color: COLORS[state.staff.length % COLORS.length],
    license: { no: '', type: LIC_TYPE, issued: today(), expires: today(365 * 5), university: '', degree: 'เภสัชศาสตรบัณฑิต' } })

  return (
    <div className="page">
      <PageHead label="Pharmacists" title="เภสัชกร &" em="พนักงาน" sub="ทะเบียนผู้ใช้งาน สิทธิ์ และเอกสารจำลองใบประกอบวิชาชีพเภสัชกรรม">
        {isAdmin && <button className="btn primary" onClick={() => setEdit(blank())}>＋ เพิ่มพนักงาน</button>}
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="พนักงานทั้งหมด" value={state.staff.length} />
        <Stat label="เภสัชกร" value={pharm.length} change="มีใบประกอบวิชาชีพ" />
        <Stat label="ใบอนุญาตใกล้หมดอายุ" value={pharm.filter((s) => licenseStatus(s.license).key === 'soon').length} change="ภายใน 60 วัน" />
        <Stat label="ใบอนุญาตหมดอายุ" value={pharm.filter((s) => licenseStatus(s.license).key === 'expired').length} change="จ่ายยาอันตรายไม่ได้" />
      </div>

      <div className="grid three">
        {state.staff.map((s) => {
          const st = licenseStatus(s.license)
          return (
            <div key={s.id} className="card hover staff-card">
              <div className="head">
                <Avatar staff={s} />
                <div style={{ flex: 1, minWidth: 0 }}><b>{s.title} {s.name}</b><br /><small className="muted">{ROLE_LABEL[s.role]}{s.id === me.id ? ' · คุณ' : ''}</small></div>
                <Badge cls={st.cls}>{st.label}</Badge>
              </div>
              {s.license ? (
                <dl className="kv">
                  <dt>เลขที่ใบอนุญาต</dt><dd className="mono"><b>{s.license.no}</b></dd>
                  <dt>สถาบัน</dt><dd>{s.license.university || '-'}</dd>
                  <dt>หมดอายุ</dt><dd>{thDate(s.license.expires)}</dd>
                </dl>
              ) : <p className="muted small">พนักงานขาย — จ่ายได้เฉพาะยาสามัญประจำบ้าน/สินค้าทั่วไป ยาอันตรายต้องให้เภสัชกรยืนยัน</p>}
              <div className="row" style={{ marginTop: 16 }}>
                {s.license && <button className="btn sm primary" onClick={() => setDoc(s.id)}>🪪 ใบประกอบวิชาชีพ</button>}
                {isAdmin && <button className="btn sm" onClick={() => setEdit({ ...s, pin: '', license: s.license || blank().license })}>แก้ไข</button>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>สิทธิ์ตามบทบาท</h3>
        <div className="grid three" style={{ gap: 14 }}>
          <div className="alert"><b>ผู้ดูแล / เภสัชกร</b><br />ทุกเมนู · ตั้งค่าร้าน · จัดการพนักงาน · รีเซ็ตข้อมูล</div>
          <div className="alert"><b>เภสัชกร</b><br />ขาย + จ่ายยาอันตราย/ควบคุมพิเศษ · จัดการคลังยา · ยกเลิกบิล</div>
          <div className="alert"><b>พนักงานขาย</b><br />ขายหน้าร้าน · ดูสต็อก/ใบเสร็จ · เพิ่มลูกค้า</div>
        </div>
      </div>

      {viewing && (
        <Modal wide title={`ใบประกอบวิชาชีพ (จำลอง) — ${viewing.title} ${viewing.name}`} onClose={() => setDoc(null)}
          footer={<><span className="muted small left">เอกสารจำลองสำหรับแสดงในระบบเท่านั้น</span><button className="btn" onClick={() => setDoc(null)}>ปิด</button><button className="btn primary" onClick={printModal}>🖨 พิมพ์</button></>}>
          <LicenseDoc staff={viewing} shop={state.settings} />
        </Modal>
      )}

      {edit && <StaffForm initial={edit} isSelf={edit.id === me.id} onClose={() => setEdit(null)}
        onSave={async (s) => { if (await act('saveStaff', s, 'บันทึกพนักงานแล้ว')) setEdit(null) }}
        onDelete={edit.id && edit.id !== me.id ? async () => { if (confirm(`ลบ ${edit.name} ออกจากระบบ?`) && await act('deleteStaff', edit.id, 'ลบพนักงานแล้ว')) setEdit(null) } : null} />}
    </div>
  )
}

function StaffForm({ initial, isSelf, onClose, onSave, onDelete }) {
  const [s, setS] = useState(initial)
  const isPh = s.role !== 'cashier'
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const setL = (k) => (e) => setS({ ...s, license: { ...s.license, [k]: e.target.value } })
  const save = () => {
    if (!s.name.trim()) return alert('กรุณากรอกชื่อ')
    if ((!s.id || s.pin) && !/^\d{4}$/.test(s.pin || '')) return alert('PIN ต้องเป็นตัวเลข 4 หลัก')
    if (isPh && (!s.license.no.trim() || !s.license.expires)) return alert('เภสัชกรต้องมีเลขที่ใบอนุญาตและวันหมดอายุ')
    onSave({ ...s, id: s.id || uid(), license: isPh ? s.license : null })
  }
  return (
    <Modal title={s.id ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'} onClose={onClose}
      footer={<>{onDelete && <button className="btn danger left" onClick={onDelete}>ลบ</button>}<button className="btn" onClick={onClose}>ยกเลิก</button><button className="btn primary" onClick={save}>บันทึก</button></>}>
      <div className="form-grid">
        <Field label="คำนำหน้า"><select value={s.title} onChange={set('title')}>{['ภก.', 'ภญ.', 'นาย', 'นาง', 'นางสาว'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="ชื่อ-สกุล *"><input value={s.name} onChange={set('name')} autoFocus /></Field>
        <Field label="บทบาท" hint={isSelf ? 'เปลี่ยนบทบาทของตัวเองไม่ได้' : ''}>
          <select value={s.role} disabled={isSelf} onChange={set('role')}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label={s.id ? 'PIN ใหม่ (เว้นว่าง = ไม่เปลี่ยน)' : 'PIN เข้าระบบ 4 หลัก *'}>
          <input type="password" inputMode="numeric" maxLength={4} value={s.pin || ''} onChange={(e) => setS({ ...s, pin: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label="สีประจำตัว" className="span2">
          <div className="row">{COLORS.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => setS({ ...s, color: c })}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, outline: s.color === c ? '3px solid var(--accent-light)' : 'none', outlineOffset: 2 }} />
          ))}</div>
        </Field>
      </div>
      {isPh && (
        <fieldset className="fs">
          <legend>ข้อมูลใบประกอบวิชาชีพ (สำหรับเอกสารจำลอง)</legend>
          <div className="form-grid">
            <Field label="เลขที่ใบอนุญาต *"><input value={s.license.no} onChange={setL('no')} placeholder="ภ.xxxxx" /></Field>
            <Field label="ประเภท"><input value={s.license.type} onChange={setL('type')} /></Field>
            <Field label="วันออกใบอนุญาต"><input type="date" value={s.license.issued || ''} onChange={setL('issued')} /></Field>
            <Field label="วันหมดอายุ *"><input type="date" value={s.license.expires || ''} onChange={setL('expires')} /></Field>
            <Field label="วุฒิการศึกษา"><input value={s.license.degree || ''} onChange={setL('degree')} /></Field>
            <Field label="สถาบันที่สำเร็จการศึกษา"><input value={s.license.university || ''} onChange={setL('university')} /></Field>
          </div>
        </fieldset>
      )}
    </Modal>
  )
}
