import { useMemo, useState } from 'react'
import { ACTIVITIES, money, num } from '../lib/rates'
import { daysOf, fmtDay, periodFor, shiftPeriod, today, weekdayShort } from '../lib/period'
import { amountOf, useStore } from '../lib/store'
import { Icon } from './Icon'

export function Week({ date, openDay }: { date: string; openDay: (d: string) => void }) {
  const { entries } = useStore()
  const [p, setP] = useState(() => periodFor(date))
  const [copied, setCopied] = useState(false)
  const now = today()
  const current = periodFor(now)
  const isCurrent = p.end === current.end

  const inPeriod = useMemo(() => entries.filter((e) => e.work_date >= p.start && e.work_date <= p.end), [entries, p])
  const total = inPeriod.reduce((s, e) => s + amountOf(e), 0)
  const days = daysOf(p).map((d) => ({ d, total: inPeriod.filter((e) => e.work_date === d).reduce((s, e) => s + amountOf(e), 0) }))
  const max = Math.max(1, ...days.map((d) => d.total))

  const lines = ACTIVITIES.map((a) => {
    const list = inPeriod.filter((e) => e.activity_code === a.code)
    return { a, qty: list.reduce((s, e) => s + e.quantity, 0), sum: list.reduce((s, e) => s + amountOf(e), 0) }
  }).filter((l) => l.qty > 0)
  const meters = (codes: number[]) => lines.filter((l) => codes.includes(l.a.code)).reduce((s, l) => s + l.qty, 0)

  const range = `${fmtDay(p.start)} – ${fmtDay(p.end)}`

  const share = async () => {
    const text = [
      `Factuurweek ${p.week} (${range})`,
      ...lines.map((l) => `${l.a.code} ${l.a.name}: ${num(l.qty)}${l.a.unit === 'uur' ? ' uur' : 'x'} = ${money(l.sum)}`),
      `Totaal: ${money(total)}`,
    ].join('\n')
    try {
      if (navigator.share) await navigator.share({ title: `Factuurweek ${p.week}`, text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  return (
    <>
      <header className="page-head">
        <h1>
          Jouw
          <br />
          factuurweek
        </h1>
        <div className="week-nav">
          <button className="round-btn" onClick={() => setP(shiftPeriod(p, -1))} aria-label="Vorige week">
            <Icon name="left" size={18} />
          </button>
          <button className="week-nav-label" onClick={() => setP(current)}>
            Week {p.week}
          </button>
          <button className="round-btn" onClick={() => setP(shiftPeriod(p, 1))} aria-label="Volgende week" disabled={isCurrent}>
            <Icon name="right" size={18} />
          </button>
        </div>
      </header>
      <p className="page-sub">
        {range} · {isCurrent ? `sluit ${fmtDay(p.end)}` : p.end < now ? 'afgesloten' : 'komt nog'}
      </p>

      <div className="bars">
        {days.map(({ d, total: t }) => {
          const h = t > 0 ? Math.max(0.16, t / max) : 0
          return (
            <button key={d} className={`bar ${d === now ? 'is-today' : ''}`} onClick={() => openDay(d)} disabled={d > now} aria-label={`${fmtDay(d)}: ${money(t)}`}>
              <span className="bar-track">
                <span className="bar-fill" style={{ height: `${h * 100}%` }}>
                  {t > 0 && <span className="bar-amount">{Math.round(t)}</span>}
                </span>
              </span>
              <span className="bar-day">{weekdayShort(d).replace('.', '')}</span>
            </button>
          )
        })}
      </div>

      <section className="card earned">
        <div className="earned-head">
          <div>
            <h3>Verdiend</h3>
            <span className="muted">{isCurrent ? 'Deze factuurweek' : `Week ${p.week}`}</span>
          </div>
          <div className="earned-total">{money(total)}</div>
        </div>
        <div className="stat-row">
          <div>
            <span>E-meters</span>
            <b>{num(meters([10, 30]))}</b>
          </div>
          <div>
            <span>G-meters</span>
            <b>{num(meters([20, 40]))}</b>
          </div>
          <div>
            <span>Niet gelukt</span>
            <b>{num(meters([0, 50, 60, 70]))}</b>
          </div>
        </div>
        <button className="btn-accent" onClick={share} disabled={lines.length === 0}>
          <Icon name="share" size={19} />
          {copied ? 'Gekopieerd' : 'Overzicht delen'}
        </button>
      </section>

      <h3 className="section-title">Specificatie</h3>
      {lines.length === 0 ? (
        <p className="empty">Geen werkzaamheden in deze periode.</p>
      ) : (
        <ul className="spec-list">
          {lines.map(({ a, qty, sum }) => (
            <li key={a.code} className={`tone-${a.tone}`}>
              <span className="icon-sq">
                <Icon name={a.icon} size={18} />
              </span>
              <span className="spec-main">
                <span className="spec-name">{a.name}</span>
                <span className="spec-sub">
                  {num(qty)}
                  {a.unit === 'uur' ? ' uur' : '×'}
                  {a.unit !== 'bedrag' && ` à ${money(a.price)}`}
                </span>
              </span>
              <span className="spec-amount">{money(sum)}</span>
            </li>
          ))}
          <li className="spec-total">
            <span>Totaal</span>
            <span>{money(total)}</span>
          </li>
        </ul>
      )}
      <p className="hint">Leg dit naast je LM Flex factuur. "Klant niet thuis" staat daar op € 0, pand onbewoond of gesloopt op € 15,30.</p>
    </>
  )
}
