import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVITIES, Activity, activity, money, num } from '../lib/rates'
import { daysOf, fmtDay, fmtLong, parse, periodFor, shiftPeriod, today } from '../lib/period'
import { Entry, addEntry, amountOf, removeEntry, restoreEntries, updateEntry, useStore } from '../lib/store'
import { Sheet } from './Sheet'
import { Icon } from './Icon'

const buzz = () => navigator.vibrate?.(15)

// ids gezet = net geturfd, dan kan er nog een adres bij.
type Toast = { label: string; verb: string; undo: () => void; ids?: string[] }

const greeting = () => {
  const h = new Date().getHours()
  return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'
}

export function Today({ date, setDate, name, openMore }: { date: string; setDate: (d: string) => void; name: string; openMore: () => void }) {
  const { entries } = useStore()
  const [toast, setToast] = useState<Toast | null>(null)
  const [ask, setAsk] = useState<Activity | null>(null)
  const [edit, setEdit] = useState<{ items: Entry[]; focus: boolean } | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [moving, setMoving] = useState(false)
  const timer = useRef<number>()

  const day = useMemo(() => entries.filter((e) => e.work_date === date).sort((a, b) => b.created_at.localeCompare(a.created_at)), [entries, date])
  const rows = useMemo(() => pairCombis(day), [day])
  const total = day.reduce((s, e) => s + amountOf(e), 0)
  const count = (codes: number[]) => day.filter((e) => codes.includes(e.activity_code)).reduce((s, e) => s + e.quantity, 0)
  const isToday = date === today()

  // Selectie per klus (sleutel = id van de eerste regel, zodat een combi één keuze is).
  const picked = rows.filter((r) => sel.has(r[0].id))
  const pickedEntries = picked.flat()
  const klussen = (n: number) => `${n} ${n === 1 ? 'klus' : 'klussen'}`
  const stopSelecting = () => {
    setSelecting(false)
    setSel(new Set())
  }
  useEffect(stopSelecting, [date])
  const toggle = (key: string) =>
    setSel((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const showToast = (t: Toast) => {
    setToast(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 5000)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const quick = (codes: number[], label: string) => {
    buzz()
    const ids = codes.map((c) => addEntry({ work_date: date, activity_code: c }).id)
    showToast({ ids, label, verb: 'geturfd', undo: () => ids.forEach(removeEntry) })
  }

  const tap = (a: Activity) => {
    if (a.reasons || a.unit !== 'stuks') return setAsk(a)
    quick([a.code], a.short)
  }

  const undo = () => {
    toast?.undo()
    setToast(null)
  }

  const removePicked = () => {
    const list = pickedEntries
    list.forEach((e) => removeEntry(e.id))
    stopSelecting()
    showToast({ label: klussen(picked.length), verb: 'verwijderd', undo: () => restoreEntries(list) })
  }

  const movePicked = (to: string) => {
    const list = pickedEntries
    list.forEach((e) => updateEntry(e.id, { work_date: to }))
    setMoving(false)
    stopSelecting()
    showToast({ label: klussen(picked.length), verb: `naar ${fmtDay(to)}`, undo: () => list.forEach((e) => updateEntry(e.id, { work_date: e.work_date })) })
  }

  return (
    <>
      <header className="hello">
        <div>
          <h1>{greeting()}</h1>
          <p className="hello-date">{fmtLong(today())}</p>
        </div>
        <button className="avatar" onClick={openMore} aria-label="Profiel">
          {name ? name[0].toUpperCase() : <Icon name="user" size={22} />}
        </button>
      </header>

      <WeekStrip date={date} setDate={setDate} entries={entries} />

      <section className="summary">
        <div>
          <span className="eyebrow">{isToday ? 'Vandaag verdiend' : `Verdiend op ${fmtDay(date)}`}</span>
          <div className="big-money">{money(total)}</div>
        </div>
        <div className="summary-chips">
          <span className="chip-stat tone-elec">
            <b>{num(count([30]))}</b> E
          </span>
          <span className="chip-stat tone-combi">
            <b>{num(count([10]))}</b> E+G
          </span>
          <span className="chip-stat tone-gas">
            <b>{num(count([40]))}</b> G
          </span>
          <span className="chip-stat tone-fail">
            <b>{num(count([0, 50, 60, 70]))}</b> niet
          </span>
        </div>
      </section>

      <button className="hero" onClick={() => quick([30], 'E-meter')}>
        <span className="hero-text">
          <span className="hero-title">E-meter gewisseld</span>
          <span className="hero-sub">{money(32.3)}</span>
        </span>
        <span className="hero-plus">
          <Icon name="plus" size={34} stroke={2.4} />
        </span>
        <span className="hero-bolt" aria-hidden>
          <Icon name="bolt" size={120} stroke={1.2} />
        </span>
      </button>

      <div className="grid-2">
        <Tile a={{ ...activity(10), icon: 'combi', short: 'Combi E+G', price: 32.3 + 10.098 }} onClick={() => quick([10, 20], 'Combi E + G')} />
        <Tile a={activity(40)} onClick={() => tap(activity(40))} />
      </div>

      <h3 className="section-title">Niet gelukt</h3>
      <div className="grid-2">
        {[0, 50, 60, 70].map((c) => (
          <Tile key={c} a={activity(c)} onClick={() => tap(activity(c))} />
        ))}
      </div>

      <h3 className="section-title">Regie &amp; kosten</h3>
      <div className="grid-3">
        {[80, 90, 100].map((c) => (
          <Tile key={c} a={activity(c)} onClick={() => tap(activity(c))} compact />
        ))}
      </div>

      <div className="section-row">
        <h3 className="section-title">Geturfd</h3>
        {rows.length > 0 &&
          (selecting ? (
            <span className="section-actions">
              <button className="text-btn" onClick={() => setSel(new Set(sel.size === rows.length ? [] : rows.map((r) => r[0].id)))}>
                {sel.size === rows.length ? 'Niets' : 'Alles'}
              </button>
              <button className="text-btn is-strong" onClick={stopSelecting}>
                Klaar
              </button>
            </span>
          ) : (
            <span className="section-actions">
              <span className="muted">{klussen(rows.length)}</span>
              <button
                className="text-btn is-strong"
                onClick={() => {
                  setToast(null)
                  setSelecting(true)
                }}
              >
                Selecteer
              </button>
            </span>
          ))}
      </div>
      {day.length === 0 ? (
        <p className="empty">Nog niks geturfd {isToday ? 'vandaag' : 'op deze dag'}. Tik op E-meter na elke wissel.</p>
      ) : (
        <ul className="timeline">
          {rows.map((items) => (
            <EntryRow
              key={items[0].id}
              items={items}
              selected={selecting ? sel.has(items[0].id) : undefined}
              onClick={() => (selecting ? toggle(items[0].id) : setEdit({ items, focus: false }))}
            />
          ))}
        </ul>
      )}

      {selecting && (
        <div className="select-bar" role="toolbar" aria-label="Selectie">
          <span className="select-count">
            <b>{picked.length} gekozen</b>
            <span>{money(pickedEntries.reduce((t, e) => t + amountOf(e), 0))}</span>
          </span>
          <button onClick={() => setMoving(true)} disabled={!picked.length}>
            Verplaats
          </button>
          <button className="is-danger" onClick={removePicked} disabled={!picked.length}>
            Verwijder
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={16} stroke={3} />
          </span>
          <span className="toast-text">
            <b>{toast.label}</b> {toast.verb}
          </span>
          {toast.ids && (
            <button
              onClick={() => {
                const list = entries.filter((x) => toast.ids!.includes(x.id))
                if (list.length) setEdit({ items: list, focus: true })
                setToast(null)
              }}
            >
              + adres
            </button>
          )}
          <button onClick={undo}>Ongedaan</button>
        </div>
      )}

      {ask && (
        <AskSheet
          a={ask}
          onClose={() => setAsk(null)}
          onSubmit={(v) => {
            buzz()
            const e = addEntry({ work_date: date, activity_code: ask.code, ...v })
            setAsk(null)
            showToast({ ids: [e.id], label: ask.short, verb: 'geturfd', undo: () => removeEntry(e.id) })
          }}
        />
      )}

      {edit && <EditSheet items={edit.items} focusAddress={edit.focus} onClose={() => setEdit(null)} />}
      {moving && <MoveSheet from={date} count={picked.length} entries={entries} onClose={() => setMoving(false)} onMove={movePicked} />}
    </>
  )
}

function WeekStrip({ date, setDate, entries }: { date: string; setDate: (d: string) => void; entries: Entry[] }) {
  const p = periodFor(date)
  const now = today()
  const worked = new Set(entries.map((e) => e.work_date))
  const isCurrent = p.end === periodFor(now).end
  return (
    <section className="strip">
      <div className="strip-head">
        <button className="round-btn" onClick={() => setDate(shiftPeriod(p, -1).end)} aria-label="Vorige factuurweek">
          <Icon name="left" size={18} />
        </button>
        <button className="strip-label" onClick={() => setDate(now)}>
          Factuurweek {p.week}
          {!isCurrent && <span className="strip-back">naar vandaag</span>}
        </button>
        <button className="round-btn" onClick={() => setDate(shiftPeriod(p, 1).start)} aria-label="Volgende factuurweek" disabled={isCurrent}>
          <Icon name="right" size={18} />
        </button>
      </div>
      <div className="strip-days">
        {daysOf(p).map((d) => {
          const future = d > now
          return (
            <button
              key={d}
              className={`strip-day ${d === date ? 'is-on' : ''} ${d === now ? 'is-today' : ''}`}
              onClick={() => setDate(d)}
              disabled={future}
              aria-label={fmtLong(d)}
              aria-pressed={d === date}
            >
              <span className="strip-dow">{new Intl.DateTimeFormat('nl-NL', { weekday: 'short' }).format(parse(d)).replace('.', '')}</span>
              <span className="strip-num">{parse(d).getDate()}</span>
              <span className={`strip-dot ${worked.has(d) ? 'is-on' : ''}`} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Tile({ a, onClick, compact }: { a: Activity; onClick: () => void; compact?: boolean }) {
  return (
    <button className={`tile tone-${a.tone} ${compact ? 'is-compact' : ''}`} onClick={onClick}>
      <span className="icon-sq">
        <Icon name={a.icon} size={compact ? 20 : 22} />
      </span>
      <span className="tile-text">
        <span className="tile-name">{a.short}</span>
        <span className="tile-price">
          {a.unit === 'bedrag' ? 'eigen bedrag' : money(a.price)}
          {a.unit === 'uur' && ' /uur'}
        </span>
      </span>
    </button>
  )
}

/**
 * Een combi-tik maakt twee regels (code 10 + 20, zo staan ze ook op de factuur).
 * In de lijst tonen we die als één klus "Combi E+G".
 */
function pairCombis(day: Entry[]): Entry[][] {
  const used = new Set<string>()
  const rows: Entry[][] = []
  for (const e of day) {
    if (used.has(e.id)) continue
    used.add(e.id)
    const mateCode = e.activity_code === 10 ? 20 : e.activity_code === 20 ? 10 : null
    const t = Date.parse(e.created_at)
    const mate =
      mateCode === null
        ? undefined
        : day.find((x) => !used.has(x.id) && x.activity_code === mateCode && Math.abs(Date.parse(x.created_at) - t) < 2000)
    if (mate) used.add(mate.id)
    rows.push(mate ? (e.activity_code === 10 ? [e, mate] : [mate, e]) : [e])
  }
  return rows
}

const COMBI: Activity = { ...activity(10), icon: 'combi', short: 'Combi E+G', name: 'Combi E+G' }
const rowActivity = (items: Entry[]) => (items.length > 1 ? COMBI : activity(items[0].activity_code))

/** selected is alleen gezet in selectiemodus. */
function EntryRow({ items, selected, onClick }: { items: Entry[]; selected?: boolean; onClick: () => void }) {
  const e = items[0]
  const a = rowActivity(items)
  const amount = items.reduce((s, x) => s + amountOf(x), 0)
  const time = new Date(e.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  const paid = amount > 0
  return (
    <li className="timeline-item">
      {selected === undefined ? (
        <span className={`timeline-dot ${paid ? 'is-paid' : ''}`}>{paid && <Icon name="check" size={12} stroke={3.4} />}</span>
      ) : (
        <span className={`timeline-dot is-pick ${selected ? 'is-on' : ''}`}>{selected && <Icon name="check" size={12} stroke={3.4} />}</span>
      )}
      <button className={`entry tone-${a.tone} ${selected ? 'is-selected' : ''}`} onClick={onClick} aria-pressed={selected}>
        <span className="icon-sq">
          <Icon name={a.icon} size={20} />
        </span>
        <span className="entry-main">
          <span className="entry-name">
            {a.unit === 'uur' ? `${num(e.quantity)} uur ` : ''}
            {a.short}
          </span>
          <span className="entry-sub">{[time, e.reason, e.address].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="entry-amount">{money(amount)}</span>
      </button>
    </li>
  )
}

function AskSheet({ a, onClose, onSubmit }: { a: Activity; onClose: () => void; onSubmit: (v: { reason?: string; quantity?: number; unit_price?: number }) => void }) {
  const [value, setValue] = useState(a.unit === 'uur' ? '1' : '')
  const n = Number(value.replace(',', '.'))
  if (a.reasons) {
    return (
      <Sheet title={`${a.short} · ${money(a.price)}`} onClose={onClose}>
        <div className="reason-list">
          {a.reasons.map((r) => (
            <button key={r} className={`reason tone-${a.tone}`} onClick={() => onSubmit({ reason: r })}>
              <span className="icon-sq">
                <Icon name={a.icon} size={20} />
              </span>
              {r}
            </button>
          ))}
        </div>
      </Sheet>
    )
  }
  return (
    <Sheet title={a.name} onClose={onClose}>
      <form
        className="form"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!(n > 0)) return
          onSubmit(a.unit === 'uur' ? { quantity: n } : { quantity: 1, unit_price: n })
        }}
      >
        <label className="field">
          <span>{a.unit === 'uur' ? `Aantal uur (${money(a.price)} per uur)` : 'Bedrag in euro'}</span>
          <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={a.unit === 'uur' ? '1' : '0,00'} />
        </label>
        {a.unit === 'uur' && (
          <div className="chips">
            {['0,5', '1', '1,5', '2', '4', '8'].map((v) => (
              <button type="button" key={v} className={`chip ${value === v ? 'is-on' : ''}`} onClick={() => setValue(v)}>
                {v}
              </button>
            ))}
          </div>
        )}
        <button className="btn-primary" disabled={!(n > 0)}>
          Toevoegen{n > 0 && ` · ${money(a.unit === 'uur' ? n * a.price : n)}`}
        </button>
      </form>
    </Sheet>
  )
}

function EditSheet({ items, focusAddress, onClose }: { items: Entry[]; focusAddress: boolean; onClose: () => void }) {
  const e = items[0]
  const isCombi = items.length > 1
  const a = activity(e.activity_code)
  const [address, setAddress] = useState(e.address ?? '')
  const [code, setCode] = useState(e.activity_code)
  const [reason, setReason] = useState(e.reason ?? '')
  const [qty, setQty] = useState(num(a.unit === 'bedrag' ? e.unit_price : e.quantity))
  const cur = activity(code)

  const save = () => {
    if (isCombi) {
      items.forEach((x) => updateEntry(x.id, { address: address.trim().toUpperCase() || null }))
      return onClose()
    }
    const n = Number(qty.replace(',', '.'))
    const changedType = code !== e.activity_code
    updateEntry(e.id, {
      activity_code: code,
      address: address.trim().toUpperCase() || null,
      reason: cur.reasons ? reason || cur.reasons[0] : null,
      quantity: cur.unit === 'uur' && n > 0 ? n : cur.unit === 'uur' ? e.quantity : 1,
      unit_price: cur.unit === 'bedrag' ? (n > 0 ? n : e.unit_price) : changedType ? cur.price : e.unit_price,
    })
    onClose()
  }

  return (
    <Sheet title={isCombi ? 'Combi E+G aanpassen' : 'Regel aanpassen'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span>Adres / werkorder (optioneel)</span>
          <input autoFocus={focusAddress} value={address} onChange={(ev) => setAddress(ev.target.value)} placeholder="bv. 4337TR-340" autoCapitalize="characters" autoComplete="off" />
        </label>
        {isCombi ? (
          <p className="muted">
            E-meter {money(items[0].unit_price)} + G-meter {money(items[1].unit_price)}. Op de factuur staan deze als twee regels.
          </p>
        ) : (
          <label className="field">
            <span>Soort werk</span>
            <select value={code} onChange={(ev) => setCode(Number(ev.target.value))}>
              {ACTIVITIES.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.name}
                  {x.unit === 'stuks' ? ` – ${money(x.price)}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {!isCombi && cur.reasons && (
          <div className="chips">
            {cur.reasons.map((r) => (
              <button type="button" key={r} className={`chip ${(reason || cur.reasons![0]) === r ? 'is-on' : ''}`} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        )}
        {!isCombi && cur.unit !== 'stuks' && (
          <label className="field">
            <span>{cur.unit === 'uur' ? 'Aantal uur' : 'Bedrag in euro'}</span>
            <input inputMode="decimal" value={qty} onChange={(ev) => setQty(ev.target.value)} />
          </label>
        )}
        <button className="btn-primary" onClick={save}>
          Opslaan
        </button>
        <button
          className="btn-outline-danger"
          onClick={() => {
            items.forEach((x) => removeEntry(x.id))
            onClose()
          }}
        >
          Verwijderen
        </button>
      </div>
    </Sheet>
  )
}

function MoveSheet({ from, count, entries, onClose, onMove }: { from: string; count: number; entries: Entry[]; onClose: () => void; onMove: (to: string) => void }) {
  const [to, setTo] = useState(from)
  return (
    <Sheet title={`${count} ${count === 1 ? 'klus' : 'klussen'} verplaatsen`} onClose={onClose}>
      <div className="form">
        <WeekStrip date={to} setDate={setTo} entries={entries} />
        <button className="btn-primary" disabled={to === from} onClick={() => onMove(to)}>
          {to === from ? 'Kies een andere dag' : `Naar ${fmtLong(to)}`}
        </button>
      </div>
    </Sheet>
  )
}
