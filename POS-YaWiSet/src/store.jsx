import { createContext, useContext, useEffect, useReducer } from 'react'
import { seedCustomers, seedProducts, seedSettings, seedStaff, PHARMACIST_ONLY } from './data/seed.js'
import { daysUntil } from './utils.js'

const KEY = 'yawiset-pos-v1'

const initial = () => ({
  products: seedProducts,
  staff: seedStaff,
  customers: seedCustomers,
  settings: seedSettings,
  receipts: [],
  gpp: [], // บันทึก ขย.
  adjustments: [], // ตัดจำหน่าย/ทำลาย/คืน
  session: null, // { staffId }
  receiptSeq: 0,
})

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return initial()
}

const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

export function reducer(state, a) {
  switch (a.type) {
    case 'LOGIN':
      return { ...state, session: { staffId: a.staffId } }
    case 'LOGOUT':
      return { ...state, session: null }

    case 'SAVE_PRODUCT':
      return { ...state, products: upsert(state.products, a.product) }
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter((p) => p.id !== a.id) }
    case 'SAVE_STAFF':
      return { ...state, staff: upsert(state.staff, a.staff) }
    case 'DELETE_STAFF':
      return { ...state, staff: state.staff.filter((s) => s.id !== a.id) }
    case 'SAVE_CUSTOMER':
      return { ...state, customers: upsert(state.customers, a.customer) }
    case 'SAVE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...a.settings } }

    case 'RECEIVE': {
      // รับยาเข้า → เพิ่ม lot + บันทึก ขย.9
      const { productId, lotNo, qty, exp, cost, supplier, invoiceNo, at, id, staffId } = a
      const products = state.products.map((p) => {
        if (p.id !== productId) return p
        const exist = p.lots.find((l) => l.lotNo === lotNo && l.exp === exp)
        const lots = exist
          ? p.lots.map((l) => (l === exist ? { ...l, qty: l.qty + qty } : l))
          : [...p.lots, { lotNo, qty, exp }]
        return { ...p, lots, cost: cost || p.cost }
      })
      const p = state.products.find((x) => x.id === productId)
      return {
        ...state,
        products,
        gpp: [...state.gpp, { id, form: 'ขย.9', at, productId, name: p?.name, lotNo, exp, qty, unit: p?.unit, partner: supplier, ref: invoiceNo, cost, staffId }],
      }
    }

    case 'WRITE_OFF': {
      const { productId, lotNo, reason, at, id, staffId } = a
      let removed = 0
      const products = state.products.map((p) => {
        if (p.id !== productId) return p
        return { ...p, lots: p.lots.filter((l) => { if (l.lotNo === lotNo) { removed += l.qty; return false } return true }) }
      })
      const p = state.products.find((x) => x.id === productId)
      return { ...state, products, adjustments: [...state.adjustments, { id, at, type: 'ทำลาย/ตัดจำหน่าย', productId, name: p?.name, lotNo, qty: removed, reason, staffId }] }
    }

    case 'CHECKOUT': {
      const { cart, receipt, gppIds } = a
      const products = state.products.map((p) => ({ ...p, lots: p.lots.map((l) => ({ ...l })) }))
      const items = []
      for (const c of cart) {
        const p = products.find((x) => x.id === c.productId)
        let need = c.qty
        const usable = p.lots.filter((l) => daysUntil(l.exp) >= 0 && l.qty > 0).sort((x, y) => x.exp.localeCompare(y.exp)) // FEFO
        const used = []
        for (const l of usable) {
          if (need <= 0) break
          const take = Math.min(l.qty, need)
          l.qty -= take
          need -= take
          used.push({ lotNo: l.lotNo, exp: l.exp, qty: take })
        }
        p.lots = p.lots.filter((l) => l.qty > 0)
        items.push({ productId: p.id, name: p.name, category: p.category, unit: p.unit, price: c.price, cost: p.cost, qty: c.qty, lots: used, dosage: c.dosage ?? p.dosage })
      }
      const cust = state.customers.find((c) => c.id === receipt.customerId)
      const newGpp = []
      items.forEach((it, i) => {
        let form = null
        if (receipt.rxNo) form = 'ขย.12'
        else if (it.category === 'ยาควบคุมพิเศษ') form = 'ขย.11'
        else if (it.category === 'ยาอันตราย') form = 'ขย.10'
        if (!form && !PHARMACIST_ONLY.includes(it.category)) return
        newGpp.push({
          id: gppIds[i], form, at: receipt.at, productId: it.productId, name: it.name,
          lotNo: it.lots.map((l) => l.lotNo).join(', '), qty: it.qty, unit: it.unit,
          partner: cust?.name || 'ลูกค้าทั่วไป', ref: receipt.no, rxNo: receipt.rxNo, prescriber: receipt.prescriber,
          staffId: receipt.pharmacistId,
        })
      })
      return {
        ...state,
        products,
        receiptSeq: state.receiptSeq + 1,
        receipts: [...state.receipts, { ...receipt, items }],
        gpp: [...state.gpp, ...newGpp],
      }
    }

    case 'VOID_RECEIPT': {
      const r = state.receipts.find((x) => x.id === a.id)
      if (!r || r.voided) return state
      const products = state.products.map((p) => {
        const it = r.items.find((i) => i.productId === p.id)
        if (!it) return p
        let lots = [...p.lots]
        for (const u of it.lots) {
          const ex = lots.find((l) => l.lotNo === u.lotNo && l.exp === u.exp)
          lots = ex ? lots.map((l) => (l === ex ? { ...l, qty: l.qty + u.qty } : l)) : [...lots, { ...u }]
        }
        return { ...p, lots }
      })
      return {
        ...state,
        products,
        receipts: state.receipts.map((x) => (x.id === a.id ? { ...x, voided: true, voidReason: a.reason, voidAt: a.at } : x)),
        adjustments: [...state.adjustments, ...r.items.map((it, i) => ({ id: a.id + '-v' + i, at: a.at, type: 'ยกเลิกบิล/รับคืน', productId: it.productId, name: it.name, lotNo: it.lots.map((l) => l.lotNo).join(', '), qty: it.qty, reason: `${r.no}: ${a.reason}`, staffId: a.staffId }))],
      }
    }

    case 'IMPORT':
      return { ...initial(), ...a.data, session: state.session }
    case 'RESET':
      return { ...initial(), session: state.session }
    default:
      return state
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ }
  }, [state])
  const me = state.session ? state.staff.find((s) => s.id === state.session.staffId) : null
  return <Ctx.Provider value={{ state, dispatch, me }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => useContext(Ctx)
