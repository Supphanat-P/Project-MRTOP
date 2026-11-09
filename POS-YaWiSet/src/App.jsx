import { useState } from 'react'
import './App.css'
import { StoreProvider, useStore } from './store.jsx'
import { licenseStatus, ROLE_LABEL } from './utils.js'
import Dashboard from './pages/Dashboard.jsx'
import POS from './pages/POS.jsx'
import Inventory from './pages/Inventory.jsx'
import Receipts from './pages/Receipts.jsx'
import Staff from './pages/Staff.jsx'
import GPP from './pages/GPP.jsx'
import Settings from './pages/Settings.jsx'

const NAV = [
  { key: 'dashboard', icon: '📊', label: 'ภาพรวม', roles: ['admin', 'pharmacist'] },
  { key: 'pos', icon: '🛒', label: 'ขายหน้าร้าน', roles: ['admin', 'pharmacist', 'cashier'] },
  { key: 'inventory', icon: '📦', label: 'คลังยา', roles: ['admin', 'pharmacist'] },
  { key: 'receipts', icon: '🧾', label: 'ใบเสร็จ', roles: ['admin', 'pharmacist', 'cashier'] },
  { key: 'gpp', icon: '📋', label: 'รายงาน ขย.', roles: ['admin', 'pharmacist'] },
  { key: 'staff', icon: '👩‍⚕️', label: 'เภสัชกร/พนักงาน', roles: ['admin', 'pharmacist', 'cashier'] },
  { key: 'settings', icon: '⚙️', label: 'ตั้งค่า', roles: ['admin'] },
]

function Login() {
  const { state, dispatch } = useStore()
  const [sel, setSel] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (sel.pin === pin) dispatch({ type: 'LOGIN', staffId: sel.id })
    else { setErr('PIN ไม่ถูกต้อง'); setPin('') }
  }
  return (
    <div className="login">
      <div className="login-box card">
        <div className="brand big"><span className="logo">💊</span> ยาวิเศษ <small>POS ร้านขายยา</small></div>
        {!sel ? (
          <>
            <p className="muted">เลือกผู้ใช้งาน</p>
            <div className="user-list">
              {state.staff.map((s) => (
                <button key={s.id} className="user-btn" onClick={() => { setSel(s); setErr('') }}>
                  <span className="avatar" style={{ background: s.color }}>{s.name[0]}</span>
                  <span><b>{s.title} {s.name}</b><br /><small className="muted">{ROLE_LABEL[s.role]}{s.license ? ` · ${s.license.no}` : ''}</small></span>
                </button>
              ))}
            </div>
            <p className="muted small">โหมดสาธิต: PIN ตัวอย่าง 1111 (ผู้ดูแล), 2222 (เภสัชกร), 3333 (พนักงานขาย)</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <p>สวัสดี <b>{sel.title} {sel.name}</b> — กรอก PIN</p>
            <input className="pin" type="password" inputMode="numeric" maxLength={4} autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
            {err && <div className="alert danger">{err}</div>}
            <div className="row gap">
              <button type="button" className="btn" onClick={() => setSel(null)}>← ย้อนกลับ</button>
              <button className="btn primary">เข้าสู่ระบบ</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Shell() {
  const { me, dispatch } = useStore()
  const allowed = NAV.filter((n) => n.roles.includes(me.role))
  const [page, setPage] = useState(allowed[0].key === 'dashboard' ? 'dashboard' : 'pos')
  const go = (k) => allowed.some((n) => n.key === k) && setPage(k)
  const lic = me.license ? licenseStatus(me.license) : null
  const Page = { dashboard: Dashboard, pos: POS, inventory: Inventory, receipts: Receipts, gpp: GPP, staff: Staff, settings: Settings }[page]
  return (
    <div className="shell">
      <aside className="side no-print">
        <div className="brand"><span className="logo">💊</span> ยาวิเศษ</div>
        <nav>
          {allowed.map((n) => (
            <button key={n.key} className={'nav ' + (page === n.key ? 'active' : '')} onClick={() => setPage(n.key)}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="me">
          <span className="avatar" style={{ background: me.color }}>{me.name[0]}</span>
          <div>
            <b>{me.title} {me.name}</b>
            <div className="small muted">{ROLE_LABEL[me.role]}</div>
            {lic && <div className={'small txt-' + lic.cls}>{me.license.no} · {lic.label}</div>}
          </div>
          <button className="icon-btn" title="ออกจากระบบ" onClick={() => dispatch({ type: 'LOGOUT' })}>⏻</button>
        </div>
      </aside>
      <main className="main"><Page go={go} /></main>
    </div>
  )
}

function Root() {
  const { me } = useStore()
  return me ? <Shell key={me.id} /> : <Login />
}

export default function App() {
  return <StoreProvider><Root /></StoreProvider>
}
