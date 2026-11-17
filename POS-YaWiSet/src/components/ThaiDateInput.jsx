import { useState } from 'react'

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const THIS_YEAR = new Date().getFullYear()
const pad = (n) => String(n).padStart(2, '0')
const daysIn = (y, m) => (y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 31)
const split = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : { y: '', m: '', d: '' }
}

export default function ThaiDateInput({ value, onChange, fromYear = 1957, toYear = THIS_YEAR }) {
  const [parts, setParts] = useState(() => split(value))
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    if (value) setParts(split(value))
  }

  const update = (k) => (e) => {
    const next = { ...parts, [k]: e.target.value ? +e.target.value : '' }
    if (next.d && next.d > daysIn(next.y, next.m)) next.d = daysIn(next.y, next.m)
    setParts(next)
    const v = next.y && next.m && next.d ? `${next.y}-${pad(next.m)}-${pad(next.d)}` : ''
    setShown(v)
    onChange(v)
  }

  const years = []
  for (let y = toYear; y >= fromYear; y--) years.push(y)

  return (
    <div className="thai-date">
      <select aria-label="วัน" value={parts.d} onChange={update('d')}>
        <option value="">วัน</option>
        {Array.from({ length: daysIn(parts.y, parts.m) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
      <select aria-label="เดือน" value={parts.m} onChange={update('m')}>
        <option value="">เดือน</option>
        {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
      </select>
      <select aria-label="ปี พ.ศ." value={parts.y} onChange={update('y')}>
        <option value="">ปี พ.ศ.</option>
        {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
      </select>
    </div>
  )
}
