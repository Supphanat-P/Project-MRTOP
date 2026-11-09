// ข้อมูลตัวอย่างสำหรับระบบสาธิต — ทุกชื่อ/เลขที่ใบอนุญาตเป็นข้อมูลสมมติ
const d = (offsetDays) => {
  const t = new Date()
  t.setDate(t.getDate() + offsetDays)
  return t.toISOString().slice(0, 10)
}

export const CATEGORIES = [
  'ยาสามัญประจำบ้าน',
  'ยาอันตราย',
  'ยาควบคุมพิเศษ',
  'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย',
  'เวชสำอาง',
  'อุปกรณ์การแพทย์',
  'อาหารเสริม',
]

// ประเภทที่ต้องมีเภสัชกรเป็นผู้จ่าย
export const PHARMACIST_ONLY = ['ยาอันตราย', 'ยาควบคุมพิเศษ']

export const seedProducts = [
  { id: 'p1', barcode: '8850001000011', name: 'พาราเซตามอล 500 มก.', generic: 'Paracetamol', category: 'ยาสามัญประจำบ้าน', unit: 'แผง', price: 15, cost: 8, minStock: 30, dosage: 'รับประทานครั้งละ 1-2 เม็ด ทุก 4-6 ชม. เมื่อมีอาการ ไม่เกิน 8 เม็ด/วัน',
    lots: [{ lotNo: 'PA2411', qty: 80, exp: d(420) }, { lotNo: 'PA2402', qty: 12, exp: d(25) }] },
  { id: 'p2', barcode: '8850001000028', name: 'อะม็อกซีซิลลิน 500 มก.', generic: 'Amoxicillin', category: 'ยาอันตราย', unit: 'แผง', price: 45, cost: 22, minStock: 20, dosage: 'รับประทานครั้งละ 1 แคปซูล วันละ 3 ครั้ง หลังอาหาร ทานติดต่อกันจนหมด',
    lots: [{ lotNo: 'AM2408', qty: 40, exp: d(300) }] },
  { id: 'p3', barcode: '8850001000035', name: 'ลอราทาดีน 10 มก.', generic: 'Loratadine', category: 'ยาอันตราย', unit: 'แผง', price: 35, cost: 15, minStock: 15, dosage: 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง',
    lots: [{ lotNo: 'LR2405', qty: 9, exp: d(200) }] },
  { id: 'p4', barcode: '8850001000042', name: 'ยาธาตุน้ำแดง 180 มล.', generic: 'Mist. Carminative', category: 'ยาสามัญประจำบ้าน', unit: 'ขวด', price: 39, cost: 20, minStock: 10, dosage: 'ผู้ใหญ่รับประทานครั้งละ 1-2 ช้อนโต๊ะ วันละ 3 ครั้ง หลังอาหาร',
    lots: [{ lotNo: 'TD2410', qty: 24, exp: d(500) }] },
  { id: 'p5', barcode: '8850001000059', name: 'โอเมพราโซล 20 มก.', generic: 'Omeprazole', category: 'ยาอันตราย', unit: 'แผง', price: 60, cost: 28, minStock: 15, dosage: 'รับประทานครั้งละ 1 แคปซูล วันละ 1 ครั้ง ก่อนอาหารเช้า 30 นาที',
    lots: [{ lotNo: 'OM2401', qty: 18, exp: d(-5) }, { lotNo: 'OM2409', qty: 30, exp: d(380) }] },
  { id: 'p6', barcode: '8850001000066', name: 'ผงเกลือแร่ ORS', generic: 'Oral Rehydration Salts', category: 'ยาสามัญประจำบ้าน', unit: 'ซอง', price: 8, cost: 4, minStock: 50, dosage: 'ละลายน้ำต้มสุก 1 แก้ว (250 มล.) จิบบ่อย ๆ',
    lots: [{ lotNo: 'OR2407', qty: 150, exp: d(600) }] },
  { id: 'p7', barcode: '8850001000073', name: 'ทรามาดอล 50 มก.', generic: 'Tramadol', category: 'ยาควบคุมพิเศษ', unit: 'แคปซูล', price: 12, cost: 5, minStock: 20, dosage: 'ตามแพทย์สั่ง',
    lots: [{ lotNo: 'TR2406', qty: 60, exp: d(250) }] },
  { id: 'p8', barcode: '8850001000080', name: 'หน้ากากอนามัย (50 ชิ้น)', generic: '-', category: 'อุปกรณ์การแพทย์', unit: 'กล่อง', price: 89, cost: 45, minStock: 10, dosage: '',
    lots: [{ lotNo: 'MK2410', qty: 35, exp: d(900) }] },
  { id: 'p9', barcode: '8850001000097', name: 'วิตามินซี 1000 มก.', generic: 'Ascorbic acid', category: 'อาหารเสริม', unit: 'ขวด', price: 250, cost: 140, minStock: 5, dosage: 'รับประทานวันละ 1 เม็ด หลังอาหาร',
    lots: [{ lotNo: 'VC2408', qty: 4, exp: d(60) }] },
  { id: 'p10', barcode: '8850001000103', name: 'แอลกอฮอล์ล้างแผล 70% 450 มล.', generic: 'Ethyl alcohol', category: 'ยาสามัญประจำบ้าน', unit: 'ขวด', price: 55, cost: 30, minStock: 10, dosage: 'ใช้ภายนอก ห้ามรับประทาน',
    lots: [{ lotNo: 'AL2409', qty: 20, exp: d(700) }] },
]

export const seedStaff = [
  { id: 's1', name: 'สมชาย ใจดี', title: 'ภก.', role: 'admin', pin: '1111', color: '#0f766e',
    license: { no: 'ภ.99001', type: 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม', issued: d(-1800), expires: d(1800), university: 'มหาวิทยาลัยตัวอย่าง', idCard: 'X-XXXX-XXXXX-01-X' } },
  { id: 's2', name: 'สุภาพร รักษ์ยา', title: 'ภญ.', role: 'pharmacist', pin: '2222', color: '#7c3aed',
    license: { no: 'ภ.99002', type: 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม', issued: d(-1790), expires: d(20), university: 'มหาวิทยาลัยสาธิต', idCard: 'X-XXXX-XXXXX-02-X' } },
  { id: 's3', name: 'มานี ขายเก่ง', title: 'นางสาว', role: 'cashier', pin: '3333', color: '#ea580c', license: null },
]

export const seedCustomers = [
  { id: 'c1', name: 'ลูกค้าทั่วไป', phone: '', allergies: '' },
  { id: 'c2', name: 'คุณวิภา สุขใจ', phone: '081-000-0001', allergies: 'แพ้ Penicillin' },
  { id: 'c3', name: 'คุณประเสริฐ มั่นคง', phone: '081-000-0002', allergies: '' },
]

export const seedSettings = {
  shopName: 'ร้านยายาวิเศษ (สาขาตัวอย่าง)',
  address: '99/9 ถนนตัวอย่าง แขวงสาธิต เขตทดลอง กรุงเทพฯ 10000',
  phone: '02-000-0000',
  taxId: '0-0000-00000-00-0',
  licenseShop: 'ข.ย.1 เลขที่ 00/2569 (สมมติ)',
  promptPay: '0000000000',
}
