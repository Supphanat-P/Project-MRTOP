import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api, getToken, session as ss, setToken } from './api.js'

const EMPTY = { products: [], staff: [], customers: [], settings: {}, receipts: [], moves: [] }
const STAFF_KEY = 'yawiset-staff'

const ACTIONS = {
  saveProduct: (p) => api('/products/' + p.id, { method: 'PUT', body: p }),
  deleteProduct: (id) => api('/products/' + id, { method: 'DELETE' }),
  receive: (r) => api('/receive', { method: 'POST', body: r }),
  writeOff: (r) => api('/write-off', { method: 'POST', body: r }),
  adjust: (r) => api('/adjust', { method: 'POST', body: r }),
  checkout: (b) => api('/checkout', { method: 'POST', body: b }),
  voidReceipt: ({ id, reason }) => api(`/receipts/${id}/void`, { method: 'POST', body: { reason } }),
  saveStaff: (s) => api('/staff/' + s.id, { method: 'PUT', body: s }),
  deleteStaff: (id) => api('/staff/' + id, { method: 'DELETE' }),
  saveCustomer: (c) => api('/customers', { method: 'POST', body: c }),
  saveSettings: (s) => api('/settings', { method: 'PUT', body: s }),
  reset: () => api('/admin/reset', { method: 'POST' }),
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(EMPTY)
  const [staffId, setStaffId] = useState(() => (getToken() ? ss.get(STAFF_KEY) : null))
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const notify = useCallback((msg, kind = '') => {
    clearTimeout(timer.current)
    setToast({ msg, kind })
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const logout = useCallback(() => {
    if (getToken()) api('/logout', { method: 'POST' }).catch(() => {})
    setToken(null); ss.set(STAFF_KEY, null)
    setStaffId(null); setState(EMPTY); setLoaded(false); setError(null)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await api('/bootstrap')
      setState(data); setLoaded(true); setError(null)
    } catch (e) {
      if (e.status === 401) logout()
      else setError(e.message)
    }
  }, [logout])

  useEffect(() => { if (staffId) refresh() }, [staffId, refresh])

  const login = async (id, pin) => {
    const r = await api('/login', { method: 'POST', body: { staffId: id, pin } })
    setToken(r.token); ss.set(STAFF_KEY, id)
    setStaffId(id)
  }

  const act = async (name, payload, okMsg) => {
    setBusy(true)
    try {
      const r = (await ACTIONS[name](payload)) || {}
      if (name === 'reset') { logout(); return r }
      await refresh()
      if (okMsg) notify(okMsg)
      return r
    } catch (e) {
      if (e.status === 401) logout()
      notify(e.message, 'danger')
      return null
    } finally {
      setBusy(false)
    }
  }

  const me = staffId ? state.staff.find((s) => s.id === staffId) || null : null
  return (
    <Ctx.Provider value={{ state, act, me, staffId, loaded, busy, error, login, logout, refresh, notify }}>
      {children}
      {toast && <div className={'toast ' + toast.kind} role="status">{toast.msg}</div>}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => useContext(Ctx)
