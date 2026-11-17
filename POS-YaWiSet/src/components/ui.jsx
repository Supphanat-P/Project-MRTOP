import { useEffect } from 'react'
import { catIndex, CATEGORY_INFO } from '../utils.js'

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

export function CatIcon({ category, size = 12, className = '' }) {
  const s = { width: size, height: size, display: 'inline-block', verticalAlign: '-1px', flexShrink: 0 }
  switch (category) {
    case 'ยาควบคุมพิเศษ':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'ยาอันตราย':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'ยาสามัญประจำบ้าน':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
        </svg>
      )
    case 'ยาบรรจุเสร็จที่ไม่ใช่ยาอันตราย':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )
    case 'เวชสำอาง':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      )
    case 'อุปกรณ์การแพทย์':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case 'อาหารเสริม':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      )
    default:
      return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
  }
}

export const CatTag = ({ category, showIcon = true }) => {
  const info = CATEGORY_INFO[category] || {
    cls: `cat-${catIndex(category)}`,
    badgeText: category,
  }
  return (
    <span className={`cat-badge ${info.cls}`}>
      {showIcon && (
        <span className="cat-badge-icon">
          <CatIcon category={category} size={11} />
        </span>
      )}
      <span className="cat-badge-text">{category}</span>
    </span>
  )
}

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
