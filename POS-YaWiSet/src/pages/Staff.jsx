import { useState } from 'react'
import { useStore } from '../store.jsx'
import { getPasswordError, isLicenseNo, isLifetime, LICENSE_NO_DIGITS, LICENSE_RENEW_DAYS, licenseExpiry, licenseStatus, licenseUntil, LIFETIME_LAST_YEAR, renewFrom, ROLE_LABEL, thDate, today, toLicenseNo, uid } from '../utils.js'
import { Avatar, Badge, Field, Modal, PageHead, PasswordCriteriaView, PasswordInput, Stat } from '../components/ui.jsx'
import LicenseDoc from '../components/LicenseDoc.jsx'
import ThaiDateInput from '../components/ThaiDateInput.jsx'
import PrintButtons from '../components/PrintButtons.jsx'
import { licenseDoc } from '../pdf.js'

const COLORS = ['#1A7A6E', '#2A9D8F', '#7c3aed', '#ea580c', '#0369a1', '#be185d', '#4d7c0f']
const LIC_TYPE = 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม'

export default function Staff() {
  const { state, act, me } = useStore()
  const isAdmin = me.role === 'admin'
  const [doc, setDoc] = useState(null)
  const [edit, setEdit] = useState(null)
  const pharm = state.staff.filter((s) => s.license)
  const viewing = state.staff.find((s) => s.id === doc)
  const remove = async (s) => confirm(`ลบ ${s.title} ${s.name} ออกจากระบบ?`) && await act('deleteStaff', s.id, 'ลบพนักงานแล้ว')

  const blank = () => ({ id: '', title: 'ภก.', name: '', role: 'pharmacist', pin: '', color: COLORS[state.staff.length % COLORS.length],
    license: { no: '', type: LIC_TYPE, issued: today(), expires: licenseExpiry(today()), university: '', degree: 'เภสัชศาสตรบัณฑิต' } })

  return (
    <div className="page">
      <PageHead label="Pharmacists" title="เภสัชกร &" em="พนักงาน" sub="ทะเบียนผู้ใช้งาน สิทธิ์ และเอกสารจำลองใบประกอบวิชาชีพเภสัชกรรม">
        {isAdmin && <button className="btn primary" onClick={() => setEdit(blank())}>＋ เพิ่มพนักงาน</button>}
      </PageHead>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Stat accent label="พนักงานทั้งหมด" value={state.staff.length} />
        <Stat label="เภสัชกร" value={pharm.length} change="มีใบประกอบวิชาชีพ" />
        <Stat label="ใบอนุญาตใกล้หมดอายุ" value={pharm.filter((s) => licenseStatus(s.license).key === 'soon').length} change={`ภายใน ${LICENSE_RENEW_DAYS} วัน · ต่ออายุได้แล้ว`} />
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
                  <dt>หมดอายุ</dt><dd>{licenseUntil(s.license)}</dd>
                </dl>
              ) : <p className="muted small">ไม่มีใบประกอบวิชาชีพ - จ่ายยาอันตรายและยาควบคุมพิเศษไม่ได้</p>}
              {s.license && !isLifetime(s.license) && (st.key === 'ok'
                ? <span className="lic-renew">ยื่นต่ออายุได้ตั้งแต่ {thDate(renewFrom(s.license))} (ล่วงหน้า {LICENSE_RENEW_DAYS} วัน)</span>
                : <span className={'lic-renew ' + st.cls}>{st.key === 'expired' ? 'ใบอนุญาตหมดอายุแล้ว - ต้องต่ออายุก่อนจ่ายยาอันตราย' : `ต่ออายุได้แล้ว - เหลืออีก ${st.days} วันก่อนหมดอายุ`}</span>)}
              <div className="row" style={{ marginTop: 16 }}>
                {s.license && <button className="btn sm primary" onClick={() => setDoc(s.id)}>ใบประกอบวิชาชีพ</button>}
                {isAdmin && <button className="btn sm" onClick={() => setEdit({ ...s, pin: '', license: s.license || blank().license })}>แก้ไข</button>}
                {isAdmin && s.id !== me.id && <button className="btn sm danger" onClick={() => remove(s)}>ลบ</button>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>สิทธิ์ตามบทบาท</h3>
        <div className="grid two" style={{ gap: 14 }}>
          <div className="alert"><b>แอดมิน (Admin)</b><br />ทุกเมนู · จัดการผู้ใช้ (เพิ่ม/แก้ไข/ลบ/ตั้งรหัสผ่าน) · รีเซ็ตข้อมูล</div>
          <div className="alert"><b>เภสัชกร (Pharmacist)</b><br />ขายและจ่ายยา · จัดการคลังยา · ยกเลิกบิล · ข้อมูลร้านและลูกค้า · ทุกอย่างยกเว้นจัดการผู้ใช้</div>
        </div>
      </div>

      {viewing && (
        <Modal wide title={`ใบประกอบวิชาชีพ (จำลอง) - ${viewing.title} ${viewing.name}`} onClose={() => setDoc(null)}
          footer={<><span className="muted small left">เอกสารจำลองสำหรับแสดงในระบบเท่านั้น</span><button className="btn" onClick={() => setDoc(null)}>ปิด</button><PrintButtons build={() => licenseDoc(viewing, state.settings)} filename={`license-${viewing.id}.pdf`} /></>}>
          <LicenseDoc staff={viewing} shop={state.settings} />
        </Modal>
      )}

      {edit && <StaffForm initial={edit} isSelf={edit.id === me.id} onClose={() => setEdit(null)}
        onSave={async (s) => { if (await act('saveStaff', s, 'บันทึกพนักงานแล้ว')) setEdit(null) }}
        onDelete={edit.id && edit.id !== me.id ? async () => { if (await remove(edit)) setEdit(null) } : null} />}
    </div>
  )
}

function StaffForm({ initial, isSelf, onClose, onSave, onDelete }) {
  const [s, setS] = useState(initial)
  const [ownerLic, setOwnerLic] = useState(!!initial.license?.no)
  const isPh = s.role === 'pharmacist' || ownerLic
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const setL = (k) => (e) => setS({ ...s, license: { ...s.license, [k]: e.target.value } })
  const setIssued = (v) => setS({ ...s, license: { ...s.license, issued: v, expires: licenseExpiry(v) } })
  const save = () => {
    if (!s.name.trim()) return alert('กรุณากรอกชื่อ')
    if (!s.id || s.pin) {
      const err = getPasswordError(s.pin)
      if (err) return alert(err)
    }
    if (isPh && (!s.license.no.trim() || !s.license.issued)) return alert('ต้องกรอกเลขที่ใบอนุญาตและวันออกใบอนุญาต')
    if (isPh && !isLicenseNo(s.license.no)) return alert(`เลขที่ใบอนุญาตต้องเป็น ภ. ตามด้วยตัวเลขไม่เกิน ${LICENSE_NO_DIGITS} หลัก`)
    if (isPh && s.license.issued > today()) return alert('วันออกใบอนุญาตต้องไม่เกินวันนี้')
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
        <Field label={s.id ? 'รหัสผ่านใหม่ (เว้นว่าง = ไม่เปลี่ยน)' : 'รหัสผ่านเข้าระบบ *'} hint={s.id ? '' : 'ตัวพิมพ์เล็ก, ใหญ่, ตัวเลข, อักขระพิเศษ'}>
          <PasswordInput value={s.pin || ''} onChange={(e) => setS({ ...s, pin: e.target.value })} placeholder={s.id ? 'เว้นว่างหากไม่เปลี่ยน' : 'เช่น Pass@1234'} />
        </Field>
        {(!s.id || s.pin) && (
          <div className="span2">
            <PasswordCriteriaView password={s.pin || ''} />
          </div>
        )}
        <Field label="สีประจำตัว" className="span2">
          <div className="row">{COLORS.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => setS({ ...s, color: c })}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, outline: s.color === c ? '3px solid var(--accent-light)' : 'none', outlineOffset: 2 }} />
          ))}</div>
        </Field>
      </div>
      {s.role === 'admin' && (
        <label className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={ownerLic} onChange={(e) => setOwnerLic(e.target.checked)} />
          แอดมินเป็นเภสัชกรด้วย (มีใบประกอบวิชาชีพ)
        </label>
      )}
      {isPh && (
        <fieldset className="fs">
          <legend>ข้อมูลใบประกอบวิชาชีพ (สำหรับเอกสารจำลอง)</legend>
          <div className="form-grid">
            <Field label="เลขที่ใบอนุญาต *" hint={`ภ. ตามด้วยตัวเลขไม่เกิน ${LICENSE_NO_DIGITS} หลัก`}>
              <input value={s.license.no} inputMode="numeric" maxLength={LICENSE_NO_DIGITS + 2} placeholder="ภ.12345" onChange={(e) => setS({ ...s, license: { ...s.license, no: toLicenseNo(e.target.value) } })} />
            </Field>
            <Field label="ประเภท"><input value={s.license.type} onChange={setL('type')} /></Field>
            <Field label="วันออกใบอนุญาต *"><ThaiDateInput value={s.license.issued || ''} onChange={setIssued} /></Field>
            <Field label="วันหมดอายุ (คำนวณอัตโนมัติ)" hint={`ออกภายในปี ${LIFETIME_LAST_YEAR + 543} = ตลอดชีพ · หลังจากนั้นใช้ได้ 5 ปี`}>
              <input readOnly tabIndex={-1} value={s.license.issued ? licenseUntil({ expires: licenseExpiry(s.license.issued) }, true) : '-'} />
            </Field>
            <Field label="วุฒิการศึกษา"><input value={s.license.degree || ''} onChange={setL('degree')} /></Field>
            <Field label="สถาบันที่สำเร็จการศึกษา"><input value={s.license.university || ''} onChange={setL('university')} /></Field>
          </div>
        </fieldset>
      )}
    </Modal>
  )
}
