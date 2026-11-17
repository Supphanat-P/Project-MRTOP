import regularUrl from './assets/fonts/Sarabun-Regular.ttf?url'
import boldUrl from './assets/fonts/Sarabun-Bold.ttf?url'
import { baht, isLifetime, licenseStatus, PAY_LABEL, thDate, thDateLong } from './utils.js'

const MM = 72 / 25.4
const ACCENT = '#1A7A6E'
const MUTED = '#5b6b69'
const DANGER = '#c0392b'

let loading
const loadPdfMake = () => (loading ||= import('pdfmake/build/pdfmake').then(({ default: pdfMake }) => {
  const abs = (u) => new URL(u, window.location.href).href
  pdfMake.addFonts({
    Sarabun: { normal: abs(regularUrl), bold: abs(boldUrl), italics: abs(regularUrl), bolditalics: abs(boldUrl) },
  })
  pdfMake.setUrlAccessPolicy((url) => url.startsWith(window.location.origin))
  return pdfMake
}))

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('th', { granularity: 'word' }) : null
const THAI = /[฀-๿]/
const BREAK = { text: ' ', fontSize: 0.1 }

export const th = (value) => {
  const s = String(value ?? '')
  if (!segmenter || !THAI.test(s)) return s
  const out = []
  let buf = ''
  for (const { segment } of segmenter.segment(s)) {
    if (buf && THAI.test(buf.at(-1)) && THAI.test(segment[0])) { out.push(buf, BREAK); buf = '' }
    buf += segment
  }
  out.push(buf)
  return out.length === 1 ? out[0] : out
}

const T = (value, style = {}) => ({ text: th(value), ...style })
const line = (width, margin = [0, 4, 0, 4], dash) => ({
  canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.6, lineColor: '#9aa7a5', ...(dash ? { dash: { length: 2 } } : {}) }],
  margin,
})
const row = (left, right, style = {}) => ({
  columns: [T(left), { text: th(right), alignment: 'right', width: 'auto' }], columnGap: 6, ...style,
})

const staffName = (s) => (s ? `${s.title} ${s.name}` : '-')

export function receiptDoc(r, state) {
  const s = state.settings
  const staff = state.staff.find((x) => x.id === r.staffId)
  const ph = state.staff.find((x) => x.id === r.pharmacistId)
  const cust = state.customers.find((c) => c.id === r.customerId)
  const W = 80 * MM
  const M = 4 * MM
  const inner = W - M * 2

  return {
    info: { title: `ใบเสร็จ ${r.no}` },
    pageSize: { width: W, height: 'auto' },
    pageMargins: [M, M, M, M],
    defaultStyle: { font: 'Sarabun', fontSize: 8.5, lineHeight: 1.15 },
    ...(r.voided ? { watermark: { text: 'ยกเลิก', color: DANGER, opacity: 0.15, bold: true } } : {}),
    content: [
      T(s.shopName, { bold: true, fontSize: 11, alignment: 'center' }),
      T(s.address, { alignment: 'center' }),
      T(`โทร ${s.phone || '-'} · เลขประจำตัวผู้เสียภาษี ${s.taxId || '-'}`, { alignment: 'center' }),
      s.licenseShop ? T(s.licenseShop, { alignment: 'center' }) : '',
      line(inner),
      T('ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ', { bold: true, alignment: 'center' }),
      row(`เลขที่ ${r.no}`, thDate(r.at, true)),
      T(`ลูกค้า: ${cust?.name || 'ลูกค้าทั่วไป'}${cust?.memberNo ? ` (สมาชิก ${cust.memberNo})` : ''}`),
      r.rxNo ? T(`ใบสั่งยา ${r.rxNo} · ${r.prescriber}`) : '',
      r.voided ? T(`ยกเลิกแล้ว - ${r.voidReason || ''}`, { color: DANGER, bold: true, margin: [0, 2, 0, 0] }) : '',
      line(inner),
      ...r.items.flatMap((it) => [
        T(it.name),
        row(`${it.qty} ${it.unit} × ${it.price.toFixed(2)}`, (it.qty * it.price).toFixed(2), { margin: [8, 0, 0, 0] }),
      ]),
      line(inner),
      row('รวม', baht(r.subtotal)),
      r.discount > 0 ? row('ส่วนลด', `-${baht(r.discount)}`) : '',
      row('ยอดสุทธิ', baht(r.total), { bold: true, fontSize: 11 }),
      { text: 'VAT Included', alignment: 'right', fontSize: 7.5, color: MUTED, margin: [0, -1, 0, 1] },
      row(`ชำระโดย ${PAY_LABEL[r.payment]}`, baht(r.received)),
      r.payment === 'cash' ? row('เงินทอน', baht(r.change)) : '',
      line(inner),
      T(`พนักงาน: ${staffName(staff)}`),
      ph ? T(`เภสัชกรผู้จ่ายยา: ${staffName(ph)} (${ph.license?.no || '-'})`) : '',
      line(inner),
      s.receiptNote ? T(s.receiptNote, { alignment: 'center' }) : '',
    ],
  }
}

export function labelsDoc(r, state) {
  const s = state.settings
  const cust = state.customers.find((c) => c.id === r.customerId)
  const ph = state.staff.find((x) => x.id === r.pharmacistId)
  const W = 80 * MM
  const M = 3.5 * MM
  const patient = cust?.memberNo ? cust.name : '..................................................'

  return {
    info: { title: `ฉลากยา ${r.no}` },
    pageSize: { width: W, height: 55 * MM },
    pageMargins: [M, M, M, M],
    defaultStyle: { font: 'Sarabun', fontSize: 8, lineHeight: 1.1 },
    content: r.items.map((it, i) => ({
      stack: [
        { columns: [T(s.shopName, { bold: true }), { text: thDate(r.at), alignment: 'right', width: 'auto' }] },
        T(it.name, { bold: true, fontSize: 12, color: ACCENT, margin: [0, 2, 0, 1] }),
        T(`ผู้ป่วย: ${patient}`),
        T(`จำนวน: ${it.qty} ${it.unit} · Lot ${it.lots.map((l) => l.lotNo).join(', ') || '-'} · Exp ${it.lots[0] ? thDate(it.lots[0].exp) : '-'}`),
        cust?.allergies ? T(`แพ้ยา: ${cust.allergies}`, { color: DANGER, bold: true }) : '',
        {
          table: { widths: ['*'], body: [[T(it.dosage || 'ตามคำแนะนำของเภสัชกร', { bold: true, fontSize: 9.5, margin: [2, 2, 2, 2] })]] },
          layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => ACCENT, vLineColor: () => ACCENT },
          margin: [0, 4, 0, 4],
        },
        T(`${ph ? `เภสัชกร ${staffName(ph)} (${ph.license?.no || '-'}) · ` : ''}โทร ${s.phone || '-'}`, { fontSize: 7, color: MUTED }),
      ],
      ...(i < r.items.length - 1 ? { pageBreak: 'after' } : {}),
    })),
  }
}

export function licenseDoc(staff, shop) {
  const lic = staff.license || {}
  const st = licenseStatus(staff.license)
  const initials = staff.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const ref = `YWS-${staff.id.toUpperCase()}-${(lic.no || '').replace(/\D/g, '')}`
  const expColor = st.cls === 'danger' ? DANGER : st.cls === 'warn' ? '#b7791f' : undefined
  const detail = (label, value, style = {}) => [T(label, { color: MUTED }), T(value || '-', style)]
  const sign = (name, caption) => ({
    width: 150,
    stack: [
      T(name, { alignment: 'center', margin: [0, 0, 0, 2] }),
      line(150, [0, 0, 0, 2], true),
      T(caption, { alignment: 'center', fontSize: 8, color: MUTED }),
    ],
  })

  return {
    info: { title: `ใบประกอบวิชาชีพ (จำลอง) ${staff.name}` },
    pageSize: 'A5',
    pageOrientation: 'landscape',
    pageMargins: [32, 28, 32, 28],
    defaultStyle: { font: 'Sarabun', fontSize: 9.5, lineHeight: 1.2 },
    watermark: { text: 'เอกสารจำลอง · SPECIMEN', color: ACCENT, opacity: 0.07, bold: true },
    content: [
      {
        columns: [
          {
            width: 40,
            table: { widths: [32], heights: [32], body: [[{ text: '+', color: '#fff', bold: true, fontSize: 22, alignment: 'center', margin: [0, -1, 0, 0] }]] },
            layout: { fillColor: () => ACCENT, hLineWidth: () => 0, vLineWidth: () => 0 },
          },
          {
            stack: [
              T('ยาวิเศษ POS · ทะเบียนเภสัชกรประจำร้าน', { fontSize: 8, color: MUTED }),
              { text: 'Pharmacy Practice License', bold: true, fontSize: 15, color: ACCENT },
              T('ใบประกอบวิชาชีพเภสัชกรรม (ฉบับจำลอง)', { bold: true }),
            ],
          },
          {
            width: 'auto',
            table: { body: [[{ text: 'เอกสารจำลอง\nSPECIMEN', bold: true, color: DANGER, alignment: 'center', fontSize: 9, margin: [6, 2, 6, 2] }]] },
            layout: { hLineColor: () => DANGER, vLineColor: () => DANGER },
          },
        ],
        columnGap: 10,
      },
      line(531, [0, 10, 0, 12]),
      {
        columns: [
          {
            width: 92,
            table: { widths: [86], heights: [104], body: [[{ text: initials, color: '#fff', bold: true, fontSize: 30, alignment: 'center', margin: [0, 30, 0, 0] }]] },
            layout: { fillColor: () => staff.color || ACCENT, hLineWidth: () => 0, vLineWidth: () => 0 },
          },
          {
            stack: [
              T('เอกสารนี้แสดงว่า', { color: MUTED, fontSize: 8.5 }),
              T(`${staff.title} ${staff.name}`, { bold: true, fontSize: 16 }),
              T(`ได้ลงทะเบียนในระบบของร้านเป็นผู้มีสิทธิ์ประกอบวิชาชีพเภสัชกรรม และปฏิบัติหน้าที่จ่ายยาที่ ${shop?.shopName || '-'}`, { margin: [0, 2, 0, 8] }),
              {
                table: {
                  widths: [118, '*'],
                  body: [
                    detail('เลขที่ใบอนุญาต', lic.no, { bold: true, fontSize: 11 }),
                    detail('ประเภทใบอนุญาต', lic.type),
                    detail('วุฒิการศึกษา', lic.degree),
                    detail('สถาบันที่สำเร็จการศึกษา', lic.university),
                    detail('วันที่ออกใบอนุญาต', thDateLong(lic.issued)),
                    detail('ใช้ได้ถึงวันที่', isLifetime(lic) ? 'ตลอดชีพ' : `${thDateLong(lic.expires)} · ${st.label}`, expColor ? { color: expColor, bold: true } : {}),
                  ],
                },
                layout: 'noBorders',
              },
            ],
          },
        ],
        columnGap: 18,
      },
      {
        columns: [
          sign(staff.name.split(' ')[0], 'ลายมือชื่อผู้ถือใบอนุญาต'),
          { width: '*', stack: [{ qr: ref, fit: 58, alignment: 'center' }, { text: ref, fontSize: 7, alignment: 'center', margin: [0, 2, 0, 0] }] },
          sign('เจ้าของร้าน', 'ผู้บันทึกข้อมูลในระบบ'),
        ],
        margin: [0, 16, 0, 0],
      },
      line(531, [0, 10, 0, 4]),
      {
        columns: [
          T(`รหัสอ้างอิงในระบบ ${ref}`, { fontSize: 7.5, color: MUTED }),
          T('ข้อมูลสมมติเพื่อการสาธิต - ตรวจสอบใบอนุญาตจริงกับสภาเภสัชกรรมก่อนใช้งาน', { fontSize: 7.5, color: MUTED, alignment: 'right' }),
        ],
      },
    ],
  }
}

export async function printPdf(doc) {
  const pdfMake = await loadPdfMake()
  const blob = await pdfMake.createPdf(doc).getBlob()
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.src = url
  document.body.appendChild(frame)
  await new Promise((resolve) => { frame.onload = resolve })
  try {
    frame.contentWindow.focus()
    frame.contentWindow.print()
  } catch {
    window.open(url, '_blank')
  }
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 60000)
}

export async function downloadPdf(doc, filename) {
  const pdfMake = await loadPdfMake()
  await pdfMake.createPdf(doc).download(filename)
}
