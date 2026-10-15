import { useMemo, useState } from 'react'
import { ACTIVITIES, activity, money, num } from '../lib/rates'
import { daysOf, fmtDay, parse, periodFor, shiftPeriod, today, weekdayShort } from '../lib/period'
import { amountOf, useStore } from '../lib/store'

export function Week({ date, openDay }: { date: string; openDay: (d: string) => void }) {
  const { entries } = useStore()
  const [p, setP] = useState(() => periodFor(date))
  const [copied, setCopied] = useState(false)
  const current = periodFor(today())
  const isCurrent = p.end === current.end

  const inPeriod = useMemo(() => entries.filter((e) => e.work_date >= p.start && e.work_date <= p.end), [entries, p])
  const total = inPeriod.reduce((s, e) => s + amountOf(e), 0)
  const days = daysOf(p).map((d) => {
    const list = inPeriod.filter((e) => e.work_date === d)
    return { d, total: list.reduce((s, e) => s + amountOf(e), 0), n: list.filter((e) => [10, 30].includes(e.activity_code)).length }
  })
  const max = Math.max(1, ...days.map((d) => d.total))

  const lines = ACTIVITIES.map((a) => {
    const list = inPeriod.filter((e) => e.activity_code === a.code)
    return { a, qty: list.reduce((s, e) => s + e.quantity, 0), sum: list.reduce((s, e) => s + amountOf(e), 0) }
  }).filter((l) => l.qty > 0)

  const meters = (codes: number[]) => lines.filter((l) => codes.includes(l.a.code)).reduce((s, l) => s + l.qty, 0)
  const range = `${fmtDay(p.start)} – ${fmtDay(p.end)}`
  const payday = parse(p.end) < parse(today())

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
      <header className="day-head">
        <button className="icon-btn" onClick={() => setP(shiftPeriod(p, -1))} aria-label="Vorige week">‹</button>
        <button className="day-title" onClick={() => setP(current)}>
          <span className="eyebrow">{isCurrent ? 'Lopende factuurweek' : payday ? 'Afgesloten periode' : 'Komende periode'}</span>
          <span className="day-name">Week {p.week}</span>
        </button>
        <button className="icon-btn" onClick={() => setP(shiftPeriod(p, 1))} aria-label="Volgende week" disabled={isCurrent}>›</button>
      </header>

      <section className="day-total">
        <div className="eyebrow center">{range} · vr t/m do</div>
        <div className="big-money">{money(total)}</div>
        <div className="day-stats">
          <span><b>{num(meters([10, 30]))}</b> E-meter{meters([10, 30]) === 1 ? '' : 's'}</span>
          <span><b>{num(meters([20, 40]))}</b> G-meter{meters([20, 40]) === 1 ? '' : 's'}</span>
        </div>
        {isCurrent && <p className="hint">Periode sluit {fmtDay(p.end)}. Daarna komt de self-billing factuur van LM Flex.</p>}
      </section>

      <div className="bars" role="list">
        {days.map(({ d, total: t, n }) => (
          <button key={d} role="listitem" className={`bar ${d === today() ? 'is-today' : ''}`} onClick={() => openDay(d)} aria-label={`${fmtDay(d)}: ${money(t)}`}>
            <span className="bar-amount">{t > 0 ? Math.round(t) : ''}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ transform: `scaleY(${t / max})` }} />
            </span>
            <span className="bar-n">{n > 0 ? `${n}E` : ''}</span>
            <span className="bar-day">{weekdayShort(d)}</span>
          </button>
        ))}
      </div>

      <h3 className="group-title">Specificatie</h3>
      {lines.length === 0 ? (
        <p className="empty">Geen werkzaamheden in deze periode.</p>
      ) : (
        <table className="spec">
          <thead>
            <tr>
              <th>Werk</th>
              <th className="r">Aantal</th>
              <th className="r">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ a, qty, sum }) => (
              <tr key={a.code}>
                <td>
                  <span className={`dot tone-${activity(a.code).tone}`} />
                  {a.name}
                  {a.unit !== 'bedrag' && <span className="muted"> à {money(a.price)}</span>}
                </td>
                <td className="r">{num(qty)}{a.unit === 'uur' ? ' u' : '×'}</td>
                <td className="r">{money(sum)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Totaal</td>
              <td className="r">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <button className="btn-secondary" onClick={share} disabled={lines.length === 0}>
        {copied ? 'Gekopieerd ✓' : 'Overzicht delen / kopiëren'}
      </button>
      <p className="hint">Leg dit naast je LM Flex factuur: "Klant niet thuis" staat daar op € 0, pand onbewoond/gesloopt op € 15,30.</p>
    </>
  )
}
