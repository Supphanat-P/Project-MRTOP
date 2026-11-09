import { licenseStatus, thDate } from '../utils.js'

// เอกสารจำลองใบประกอบวิชาชีพของเภสัชกร — สำหรับแสดงในระบบ/ทดสอบเท่านั้น
// ออกแบบเป็นการ์ดของระบบเอง ไม่ใช้ตรา/แบบฟอร์มของหน่วยงานจริง และมีลายน้ำ "เอกสารจำลอง" เสมอ
export default function LicenseCard({ staff, shop }) {
  const lic = staff.license
  const st = licenseStatus(lic)
  const initials = staff.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return (
    <div className="lic-card">
      <div className="lic-watermark" aria-hidden="true">
        <span>เอกสารจำลอง · SAMPLE</span><span>ไม่ใช่เอกสารราชการ</span><span>เอกสารจำลอง · SAMPLE</span>
      </div>
      <div className="lic-head">
        <div className="lic-logo">💊</div>
        <div>
          <div className="lic-org">ระบบ ยาวิเศษ POS — ทะเบียนเภสัชกรประจำร้าน</div>
          <div className="lic-title">ข้อมูลใบอนุญาตประกอบวิชาชีพ (จำลอง)</div>
        </div>
        <span className={'badge ' + st.cls}>{st.label}</span>
      </div>
      <div className="lic-body">
        <div className="lic-photo" style={{ background: staff.color }}>{initials}</div>
        <dl className="lic-info">
          <dt>ชื่อ-สกุล</dt><dd><b>{staff.title} {staff.name}</b></dd>
          <dt>ประเภท</dt><dd>{lic?.type || '-'}</dd>
          <dt>เลขที่ใบอนุญาต</dt><dd className="mono big">{lic?.no || '-'}</dd>
          <dt>สถาบันที่สำเร็จ</dt><dd>{lic?.university || '-'}</dd>
          <dt>วันออกใบอนุญาต</dt><dd>{thDate(lic?.issued)}</dd>
          <dt>วันหมดอายุ</dt><dd className={st.cls === 'danger' ? 'txt-danger' : ''}>{thDate(lic?.expires)}</dd>
          <dt>ปฏิบัติงานที่</dt><dd>{shop?.shopName}</dd>
        </dl>
      </div>
      <div className="lic-foot">
        <span>รหัสพนักงาน {staff.id.toUpperCase()}</span>
        <span>ข้อมูลสมมติเพื่อการสาธิต — โปรดตรวจสอบใบอนุญาตจริงกับสภาเภสัชกรรม</span>
      </div>
    </div>
  )
}
