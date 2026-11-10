import { useEffect, useState } from 'react'
import { api } from './api.js'
import { StoreProvider, useStore } from './store.jsx'
import { licenseStatus, ROLE_LABEL } from './utils.js'
import { Avatar } from './components/ui.jsx'
import Dashboard from './pages/Dashboard.jsx'
import POS from './pages/POS.jsx'
import Inventory from './pages/Inventory.jsx'
import Receipts from './pages/Receipts.jsx'
import Staff from './pages/Staff.jsx'
import Settings from './pages/Settings.jsx'

const NAV = [
  { key: 'dashboard', label: 'ภาพรวม', el: Dashboard },
  { key: 'pos', label: 'ขายหน้าร้าน', el: POS },
  { key: 'inventory', label: 'คลังยา & สต็อก', el: Inventory },
  { key: 'receipts', label: 'ใบเสร็จ', el: Receipts },
  { key: 'staff', label: 'เภสัชกร / พนักงาน', el: Staff },
  { key: 'settings', label: 'ร้านค้า', el: Settings },
]

function Login() {
  const { login } = useStore()
  const [staff, setStaff] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [sel, setSel] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const loadStaff = () => {
    setLoadErr('')
    api('/public/staff').then(setStaff).catch((e) => setLoadErr(e.message))
  }
  useEffect(loadStaff, [])

  const submit = async (e) => {
    e?.preventDefault()
    if (pin.length !== 4) return setErr('กรอก PIN 4 หลัก')
    setBusy(true); setErr('')
    try { await login(sel.id, pin) } catch (ex) { setErr(ex.message); setPin('') } finally { setBusy(false) }
  }
  const press = (k) => setPin((p) => (k === '⌫' ? p.slice(0, -1) : k === 'C' ? '' : (p + k).slice(0, 4)))

  return (
    <div className="login">
      <div className="login-hero">
        <div className="hero-badge"><b>✚</b> ระบบร้านขายยา · <strong style={{ color: 'var(--accent)' }}>เชื่อมต่อ MySQL</strong></div>
        <h1>ขายยา จัดการคลัง <em>อย่างมั่นใจ</em></h1>
        <p>POS สำหรับร้านขายยา — ตัดสต็อกตาม Lot และวันหมดอายุ ออกใบเสร็จและฉลากยา ตรวจสิทธิ์เภสัชกรก่อนจ่ายยาอันตราย พร้อมทะเบียนใบประกอบวิชาชีพ</p>
        <div className="trust"><span>FEFO หมดอายุก่อนออกก่อน</span><span>ใบเสร็จ & ฉลากยา</span><span>ทะเบียนเภสัชกร</span></div>
      </div>

      <div className="window">
        <div className="window-bar"><i /><i /><i /><span className="title">เข้าสู่ระบบ — ยาวิเศษ</span></div>
        <div className="window-body">
          {loadErr ? (
            <>
              <div className="alert danger">{loadErr}</div>
              <p className="muted small" style={{ margin: '12px 0' }}>ตรวจสอบว่า MySQL เปิดอยู่ รัน <code>npm run db:init</code> และ <code>npm run server</code> แล้ว</p>
              <button className="btn" onClick={loadStaff}>ลองใหม่</button>
            </>
          ) : !staff ? <p className="muted">กำลังเชื่อมต่อฐานข้อมูล…</p> : !sel ? (
            <>
              <h3>เลือกผู้ใช้งาน</h3>
              <div className="user-list">
                {staff.map((s) => (
                  <button key={s.id} className="user-btn" onClick={() => { setSel(s); setErr(''); setPin('') }}>
                    <Avatar staff={s} />
                    <span><b>{s.title} {s.name}</b><br /><small className="muted">{ROLE_LABEL[s.role]}{s.licenseNo ? ` · ${s.licenseNo}` : ''}</small></span>
                  </button>
                ))}
                {!staff.length && <div className="alert warn">ยังไม่มีพนักงานในระบบ — รัน <code>npm run db:init</code></div>}
              </div>
              <p className="muted small" style={{ marginTop: 14 }}>ข้อมูลตัวอย่าง: PIN 1111 ผู้ดูแล · 2222 เภสัชกร · 3333 พนักงานขาย</p>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="row" style={{ marginBottom: 14 }}>
                <Avatar staff={sel} size={44} />
                <div><b>{sel.title} {sel.name}</b><br /><small className="muted">{ROLE_LABEL[sel.role]}</small></div>
              </div>
              <input className="pin-input" type="password" inputMode="numeric" maxLength={4} autoFocus value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="PIN" />
              <div className="keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => <button type="button" key={k} onClick={() => press(k)}>{k}</button>)}
              </div>
              {err && <div className="alert danger" style={{ marginBottom: 12 }}>{err}</div>}
              <div className="row">
                <button type="button" className="btn" onClick={() => setSel(null)}>← ย้อนกลับ</button>
                <button className="btn primary" style={{ flex: 1 }} disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ →'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { me, logout } = useStore()
  const [page, setPage] = useState('pos')
  const [menu, setMenu] = useState(false)
  const Page = NAV.find((n) => n.key === page).el
  const lic = licenseStatus(me.license)
  const go = (k) => { setPage(k); setMenu(false); window.scrollTo(0, 0) }

  return (
    <>
      <nav className="nav no-print">
        <div className="nav-inner">
          <div className="nav-logo"><span className="mark">✚</span>ยาวิเศษ<span>POS</span></div>
          <div className="nav-links">
            {NAV.map((n) => <button key={n.key} className={page === n.key ? 'active' : ''} onClick={() => go(n.key)}>{n.label}</button>)}
          </div>
          <div className="nav-user">
            <div className="who"><b>{me.title} {me.name}</b><br /><small>{ROLE_LABEL[me.role]}{me.license && lic.key !== 'ok' ? ` · ใบอนุญาต${lic.label}` : ''}</small></div>
            <Avatar staff={me} />
            <button className="icon-btn" title="ออกจากระบบ" aria-label="ออกจากระบบ" onClick={logout}>⏻</button>
            <button className={'nav-hamburger' + (menu ? ' open' : '')} aria-label="เมนู" onClick={() => setMenu(!menu)}><span /><span /><span /></button>
          </div>
        </div>
      </nav>
      <div className={'mobile-menu no-print' + (menu ? ' open' : '')}>
        {NAV.map((n) => <button key={n.key} className={page === n.key ? 'active' : ''} onClick={() => go(n.key)}>{n.label}</button>)}
        <button onClick={logout}>ออกจากระบบ ({me.name})</button>
      </div>
      <Page go={go} />
    </>
  )
}

function Root() {
  const { me, staffId, loaded, error, refresh, logout } = useStore()
  if (!staffId) return <Login />
  if (!loaded || !me) {
    return (
      <div className="login" style={{ gridTemplateColumns: '1fr', maxWidth: 520 }}>
        <div className="window"><div className="window-bar"><i /><i /><i /></div><div className="window-body">
          {error || loaded ? <>
            <div className="alert danger">{error || 'ไม่พบบัญชีผู้ใช้นี้ในระบบ'}</div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={refresh}>ลองใหม่</button>
              <button className="btn" onClick={logout}>ออกจากระบบ</button>
            </div>
          </> : <p className="muted">กำลังโหลดข้อมูลจากฐานข้อมูล…</p>}
        </div></div>
      </div>
    )
  }
  return <Shell key={me.id} />
}

export default function App() {
  return <StoreProvider><Root /></StoreProvider>
}
