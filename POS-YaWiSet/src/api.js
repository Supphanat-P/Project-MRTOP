const TOKEN_KEY = 'yawiset-token'

const store = {
  get: (k) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch {} },
}
export const getToken = () => store.get(TOKEN_KEY)
export const setToken = (t) => store.set(TOKEN_KEY, t)
export const session = store

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    const token = getToken()
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ - ตรวจสอบว่ารัน npm run server แล้ว'), { status: 0 })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = res.status >= 502 && !data.error ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ - ตรวจสอบว่ารัน npm run server แล้ว' : data.error || `ผิดพลาด (${res.status})`
    throw Object.assign(new Error(msg), { status: res.status })
  }
  return data
}
