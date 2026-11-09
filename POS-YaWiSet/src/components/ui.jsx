import { useEffect } from 'react'

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn no-print" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot no-print">{footer}</div>}
      </div>
    </div>
  )
}

export const Badge = ({ cls = '', children }) => <span className={'badge ' + cls}>{children}</span>

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Stat({ icon, label, value, sub, tone }) {
  return (
    <div className={'stat ' + (tone || '')}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

export const Empty = ({ children }) => <div className="empty">{children}</div>

export const catClass = (c) =>
  c === 'ยาควบคุมพิเศษ' ? 'danger' : c === 'ยาอันตราย' ? 'warn' : c === 'ยาสามัญประจำบ้าน' ? 'ok' : 'muted'
