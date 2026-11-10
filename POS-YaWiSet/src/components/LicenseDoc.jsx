import { licenseStatus, thDateLong } from '../utils.js'

// เอกสารจำลองใบประกอบวิชาชีพเภสัชกรรม — ใช้แสดง/พิมพ์ในระบบเพื่อการสาธิตและฝึกอบรมเท่านั้น
// ออกแบบเป็นเอกสารของระบบเอง: ไม่ใช้ตรา ชื่อ หรือแบบฟอร์มของหน่วยงานจริง และมีลายน้ำ "เอกสารจำลอง" เสมอ
export default function LicenseDoc({ staff, shop }) {
  const lic = staff.license || {}
  const st = licenseStatus(staff.license)
  const initials = staff.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const ref = `YWS-${staff.id.toUpperCase()}-${(lic.no || '').replace(/\D/g, '')}`

  return (
    <div className="lic-doc">
      <div className="wm" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <span key={i}>เอกสารจำลอง · SPECIMEN · ไม่ใช่เอกสารราชการ</span>)}
      </div>

      <div className="lic-top">
        <div className="lic-seal">✚</div>
        <div>
          <div className="lic-org">ยาวิเศษ POS · ทะเบียนเภสัชกรประจำร้าน</div>
          <div className="lic-title">Pharmacy Practice License</div>
          <div className="lic-title-th">ใบประกอบวิชาชีพเภสัชกรรม (ฉบับจำลอง)</div>
        </div>
        <div className="lic-sample">เอกสารจำลอง<br />SPECIMEN</div>
      </div>

      <div className="lic-main">
        <div className="lic-photo" style={{ background: staff.color }}>{initials}</div>
        <div className="lic-text">
          <p className="muted small">เอกสารนี้แสดงว่า</p>
          <div className="lic-name">{staff.title} {staff.name}</div>
          <p className="small">ได้ลงทะเบียนในระบบของร้านเป็นผู้มีสิทธิ์ประกอบวิชาชีพเภสัชกรรม และปฏิบัติหน้าที่จ่ายยาที่ <b>{shop?.shopName || '-'}</b></p>
          <dl className="lic-dl">
            <dt>เลขที่ใบอนุญาต</dt><dd className="lic-no">{lic.no || '-'}</dd>
            <dt>ประเภทใบอนุญาต</dt><dd>{lic.type || '-'}</dd>
            <dt>วุฒิการศึกษา</dt><dd>{lic.degree || '-'}</dd>
            <dt>สถาบันที่สำเร็จการศึกษา</dt><dd>{lic.university || '-'}</dd>
            <dt>วันที่ออกใบอนุญาต</dt><dd>{thDateLong(lic.issued)}</dd>
            <dt>ใช้ได้ถึงวันที่</dt><dd style={{ color: st.cls === 'danger' ? 'var(--danger)' : st.cls === 'warn' ? 'var(--warn)' : undefined }}>{thDateLong(lic.expires)} · {st.label}</dd>
          </dl>
        </div>
      </div>

      <div className="lic-bottom">
        <div className="lic-sign"><div className="line">{staff.name.split(' ')[0]}</div>ลายมือชื่อผู้ถือใบอนุญาต</div>
        <div style={{ textAlign: 'center' }}><div className="lic-qr" aria-hidden="true" /><div className="mono" style={{ fontSize: '.62rem', marginTop: 4 }}>{ref}</div></div>
        <div className="lic-sign"><div className="line">ผู้ดูแลระบบ</div>ผู้บันทึกข้อมูลในระบบ</div>
      </div>

      <div className="lic-foot">
        <span>รหัสอ้างอิงในระบบ {ref}</span>
        <span>ข้อมูลสมมติเพื่อการสาธิต — ตรวจสอบใบอนุญาตจริงกับสภาเภสัชกรรมก่อนใช้งาน</span>
      </div>
    </div>
  )
}
