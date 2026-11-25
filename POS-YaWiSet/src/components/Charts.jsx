import { useState } from 'react'

const niceMax = (v) => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p
  return 10 * p
}
const short = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)))

export function Legend({ series, totals, fmt }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.color }} />
          {s.label}
          {totals && <b>{fmt(totals[s.key])}</b>}
        </span>
      ))}
    </div>
  )
}

export function ColumnChart({ data, series, fmt, height = 180, labelEvery = 1, empty = 'ยังไม่มีข้อมูล' }) {
  const [hover, setHover] = useState(null)
  const sum = (d) => series.reduce((a, s) => a + Math.max(d.values[s.key] || 0, 0), 0)
  const max = niceMax(Math.max(...data.map(sum), 0))
  const ticks = [0, 0.5, 1].map((f) => f * max)
  if (!data.some((d) => sum(d) > 0)) return <div className="chart-empty" style={{ height }}>{empty}</div>
  return (
    <div className="chart" style={{ height }}>
      <div className="chart-grid">
        {ticks.map((t) => (
          <div key={t} style={{ bottom: `${(t / max) * 100}%` }}><span>{short(t)}</span></div>
        ))}
      </div>
      <div className="chart-cols">
        {data.map((d, i) => (
          <div key={d.key} className={'chart-col' + (hover === i ? ' on' : '')}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="chart-stack" style={{ height: `${(sum(d) / max) * 100}%` }}>
              {series.map((s) => {
                const v = Math.max(d.values[s.key] || 0, 0)
                return v > 0 && <div key={s.key} style={{ flexGrow: v, background: s.color }} />
              })}
            </div>
            <small>{i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}</small>
            {hover === i && (
              <div className={'chart-tip' + (i > data.length / 2 ? ' left' : '')}>
                <b>{d.title}</b>
                {series.map((s) => (
                  <div key={s.key}><i style={{ background: s.color }} />{s.label}<span>{fmt(d.values[s.key] || 0)}</span></div>
                ))}
                {d.extra?.map(([k, v]) => <div key={k} className="muted"><i />{k}<span>{v}</span></div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarList({ items, color, fmt }) {
  const max = Math.max(...items.map((x) => x.value), 1)
  return (
    <div className="barlist">
      {items.map((x) => (
        <div key={x.label} className="barlist-row" title={`${x.label} · ${fmt(x.value)}`}>
          <span className="barlist-label">{x.label}</span>
          <span className="barlist-track"><span style={{ width: `${(x.value / max) * 100}%`, background: color }} /></span>
          <span className="barlist-value">{fmt(x.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartTable({ data, series, fmt }) {
  return (
    <div className="table-wrap chart-table">
      <table>
        <thead><tr><th>วันที่</th>{series.map((s) => <th key={s.key} className="right">{s.label}</th>)}</tr></thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.key}><td>{d.title}</td>{series.map((s) => <td key={s.key} className="right">{fmt(d.values[s.key] || 0)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ViewToggle({ value, onChange }) {
  return (
    <div className="seg sm">
      <button className={value === 'chart' ? 'on' : ''} onClick={() => onChange('chart')}>กราฟ</button>
      <button className={value === 'table' ? 'on' : ''} onClick={() => onChange('table')}>ตาราง</button>
    </div>
  )
}
