import { useMemo, useState } from 'react'
import { ACTIVITIES, money, num } from '../lib/rates'
import { Period, addDays, daysOf, fmtDay, periodFor, shiftPeriod, today, weekdayShort } from '../lib/period'
import { amountOf, useStore } from '../lib/store'
import { shareFile, weekCsv, weekPdf } from '../lib/export'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

type WeekProps = { date: string; openDay: (d: string) => void; who: string }

export function Week(props: WeekProps) {
  const [view, setView] = useState<'work' | 'pay'>('work')
  return (
    <>
      <div className="segmented is-pair" role="radiogroup" aria-label="Overzicht">
        <button role="radio" aria-checked={view === 'work'} className={view === 'work' ? 'is-on' : ''} onClick={() => setView('work')}>
          <Icon name="chart" size={18} />
          Gewerkt
        </button>
        <button role="radio" aria-checked={view === 'pay'} className={view === 'pay' ? 'is-on' : ''} onClick={() => setView('pay')}>
          <Icon name="clock" size={18} />
          Uitbetaling
        </button>
      </div>
      {view === 'work' ? <Worked {...props} /> : <Payouts />}
    </>
  )
}

// LM Flex betaalt 4 weken na de donderdag waarop de factuurweek sluit.
export const payDay = (p: Period) => addDays(p.end, 28)

function Payouts() {
  const { entries } = useStore()
  const now = today()
  // shortcut: 8 weken terug; de app haalt toch maar 120 dagen op.
  const weeks = Array.from({ length: 9 }, (_, i) => shiftPeriod(periodFor(now), -i)).map((p) => ({
    p,
    pay: payDay(p),
    total: entries.filter((e) => e.work_date >= p.start && e.work_date <= p.end).reduce((s, e) => s + amountOf(e), 0),
  }))
  const coming = weeks.filter((w) => w.pay >= now).reverse()
  const paid = weeks.filter((w) => w.pay < now).slice(0, 4)
  const next = coming[0]
  const open = coming.reduce((s, w) => s + w.total, 0)

  const row = ({ p, pay, total }: (typeof weeks)[number], done: boolean) => (
    <li key={p.end} className={done ? 'tone-hour' : p.end >= now ? 'tone-elec' : 'tone-gas'}>
      <span className="icon-sq">
        <Icon name={done ? 'check' : 'clock'} size={18} />
      </span>
      <span className="spec-main">
        <span className="spec-name">{pay === now ? 'Vandaag' : fmtDay(pay)}</span>
        <span className="spec-sub">
          Week {p.week} · {p.end >= now ? 'loopt nog' : `${fmtDay(p.start)} – ${fmtDay(p.end)}`}
        </span>
      </span>
      <span className="spec-amount">{money(total)}</span>
    </li>
  )

  return (
    <>
      <header className="page-head">
        <h1>
          Jouw
          <br />
          uitbetalingen
        </h1>
      </header>
      <p className="page-sub">Elke donderdag, 4 weken na het sluiten van de factuurweek</p>

      <section className="card earned">
        <div className="earned-head">
          <div>
            <h3>{next.pay === now ? 'Vandaag' : 'Volgende'}</h3>
            <span className="muted">
              {fmtDay(next.pay)} · werk van week {next.p.week}
            </span>
          </div>
          <div className="earned-total">{money(next.total)}</div>
        </div>
      </section>

      <h3 className="section-title">Komt nog</h3>
      <ul className="spec-list">
        {coming.map((w) => row(w, false))}
        <li className="spec-total">
          <span>Nog te ontvangen</span>
          <span>{money(open)}</span>
        </li>
      </ul>

      <h3 className="section-title">Al uitbetaald</h3>
      <ul className="spec-list">{paid.map((w) => row(w, true))}</ul>
    </>
  )
}

function Worked({ date, openDay, who }: WeekProps) {
  const { entries } = useStore()
  const [p, setP] = useState(() => periodFor(date))
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [busy, setBusy] = useState(false)
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

  const exportFile = async (ext: 'pdf' | 'csv') => {
    setBusy(true)
    try {
      await shareFile(ext === 'pdf' ? await weekPdf(p, inPeriod, who) : weekCsv(inPeriod), p, ext)
      setExporting(false)
    } finally {
      setBusy(false)
    }
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
        <button className="btn-accent" onClick={() => setExporting(true)} disabled={lines.length === 0}>
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

      {exporting && (
        <Sheet title={`Week ${p.week} delen`} onClose={() => setExporting(false)}>
          <div className="reason-list">
            <button className="reason tone-paid-fail" onClick={() => exportFile('pdf')} disabled={busy}>
              <span className="icon-sq">
                <Icon name="share" size={20} />
              </span>
              <span className="list-main">
                <b>PDF</b>
                <span className="muted">Specificatie en alle regels, voor je boekhouder of LM Flex</span>
              </span>
            </button>
            <button className="reason tone-hour" onClick={() => exportFile('csv')} disabled={busy}>
              <span className="icon-sq">
                <Icon name="chart" size={20} />
              </span>
              <span className="list-main">
                <b>CSV voor Excel</b>
                <span className="muted">Elke regel met datum, tijd, code en adres</span>
              </span>
            </button>
            <button className="reason tone-fail" onClick={share}>
              <span className="icon-sq">
                <Icon name="tally" size={20} />
              </span>
              <span className="list-main">
                <b>{copied ? 'Gekopieerd' : 'Als tekst'}</b>
                <span className="muted">Kort overzicht voor WhatsApp of mail</span>
              </span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
