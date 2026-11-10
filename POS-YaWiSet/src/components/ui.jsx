import { useEffect } from 'react'
import { catIndex } from '../utils.js'

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'window modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="window-bar"><i /><i /><i /><span className="title">{title}</span><span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <div className="window-body">
          {children}
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export const Field = ({ label, hint, className = '', children }) => (
  <label className={'field ' + className}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
)

export const Badge = ({ cls = '', children }) => <span className={'badge ' + cls}>{children}</span>

export const CatTag = ({ category }) => <span className={`cat-tag cat-${catIndex(category)}`}>{category}</span>

export const PageHead = ({ label, title, em, sub, children }) => (
  <div className="page-head">
    <div>
      <div className="section-label">{label}</div>
      <h1 className="section-title">{title} {em && <em>{em}</em>}</h1>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
    {children && <div className="actions">{children}</div>}
  </div>
)

export const Stat = ({ label, value, change, accent }) => (
  <div className={'stat' + (accent ? ' accent' : '')}>
    <div className="stat-label">{label}</div>
    <div className="stat-val">{value}</div>
    {change && <div className="stat-change">{change}</div>}
  </div>
)

export const Avatar = ({ staff, size }) => (
  <span className="avatar" style={{ background: staff?.color || 'var(--accent)', ...(size ? { width: size, height: size } : {}) }}>
    {staff?.name?.[0] || '?'}
  </span>
)
