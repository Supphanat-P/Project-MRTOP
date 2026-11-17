import { useState } from 'react'
import { useStore } from '../store.jsx'
import { downloadPdf, printPdf } from '../pdf.js'

export default function PrintButtons({ build, filename }) {
  const { notify } = useStore()
  const [working, setWorking] = useState('')
  const run = async (kind) => {
    setWorking(kind)
    try {
      if (kind === 'print') await printPdf(build())
      else await downloadPdf(build(), filename)
    } catch (e) {
      notify('สร้าง PDF ไม่สำเร็จ: ' + e.message, 'danger')
    } finally {
      setWorking('')
    }
  }
  return (
    <>
      <button className="btn" disabled={!!working} onClick={() => run('download')}>{working === 'download' ? 'กำลังสร้าง...' : 'PDF'}</button>
      <button className="btn primary" disabled={!!working} onClick={() => run('print')}>{working === 'print' ? 'กำลังสร้าง...' : 'พิมพ์'}</button>
    </>
  )
}
