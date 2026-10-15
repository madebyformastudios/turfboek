import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVITIES, Activity, activity, money, num } from '../lib/rates'
import { addDays, fmtLong, periodFor, today } from '../lib/period'
import { Entry, addEntry, amountOf, removeEntry, updateEntry, useStore } from '../lib/store'
import { Sheet } from './Sheet'

const buzz = () => navigator.vibrate?.(15)

type Toast = { ids: string[]; label: string }
type Ask = { a: Activity; editId?: string }

export function Today({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { entries } = useStore()
  const [toast, setToast] = useState<Toast | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [edit, setEdit] = useState<Entry | null>(null)
  const timer = useRef<number>()

  const day = useMemo(() => entries.filter((e) => e.work_date === date).sort((a, b) => b.created_at.localeCompare(a.created_at)), [entries, date])
  const total = day.reduce((s, e) => s + amountOf(e), 0)
  const count = (codes: number[]) => day.filter((e) => codes.includes(e.activity_code)).reduce((s, e) => s + e.quantity, 0)
  const isToday = date === today()
  const p = periodFor(date)

  const showToast = (t: Toast) => {
    setToast(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 5000)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const quick = (codes: number[], label: string) => {
    buzz()
    const ids = codes.map((c) => addEntry({ work_date: date, activity_code: c }).id)
    showToast({ ids, label })
  }

  const tap = (a: Activity) => {
    if (a.reasons || a.unit !== 'stuks') return setAsk({ a })
    quick([a.code], a.short)
  }

  const undo = () => {
    toast?.ids.forEach(removeEntry)
    setToast(null)
  }

  return (
    <>
      <header className="day-head">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Vorige dag">‹</button>
        <button className="day-title" onClick={() => setDate(today())}>
          <span className="eyebrow">{isToday ? 'Vandaag' : 'Terug naar vandaag'} · wk {p.week}</span>
          <span className="day-name">{fmtLong(date)}</span>
        </button>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Volgende dag" disabled={isToday}>›</button>
      </header>

      <section className="day-total">
        <div className="big-money">{money(total)}</div>
        <div className="day-stats">
          <span><b>{num(count([10, 30]))}</b> E</span>
          <span><b>{num(count([20, 40]))}</b> G</span>
          <span><b>{num(count([0]))}</b> niet thuis</span>
          <span><b>{num(count([50, 60, 70]))}</b> TNU/NU</span>
        </div>
      </section>

      <button className="btn-elec" onClick={() => quick([30], 'E-meter')}>
        <span className="btn-elec-label">
          <span className="plus">+</span> E-meter
        </span>
        <span className="btn-elec-price">{money(32.3)}</span>
      </button>

      <div className="row-2">
        <button className="btn-tile tone-gas" onClick={() => quick([10, 20], 'Combi E + G')}>
          <span className="tile-name">Combi E + G</span>
          <span className="tile-price">{money(32.3 + 10.098)}</span>
        </button>
        <button className="btn-tile tone-gas" onClick={() => tap(activity(40))}>
          <span className="tile-name">Solo gas</span>
          <span className="tile-price">{money(27.46)}</span>
        </button>
      </div>

      <h3 className="group-title">Niet gelukt</h3>
      <div className="row-2">
        {[0, 50, 60, 70].map((c) => (
          <Tile key={c} a={activity(c)} onClick={() => tap(activity(c))} />
        ))}
      </div>

      <h3 className="group-title">Regie &amp; kosten</h3>
      <div className="row-3">
        {[80, 90, 100].map((c) => (
          <Tile key={c} a={activity(c)} onClick={() => tap(activity(c))} />
        ))}
      </div>

      <h3 className="group-title">
        Geturfd {day.length > 0 && <span className="muted">· {day.length}</span>}
      </h3>
      {day.length === 0 ? (
        <p className="empty">Nog niks geturfd {isToday ? 'vandaag' : 'op deze dag'}. Tik op E-meter na elke wissel.</p>
      ) : (
        <ul className="entry-list">
          {day.map((e) => (
            <EntryRow key={e.id} e={e} onClick={() => setEdit(e)} />
          ))}
        </ul>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>
            <b>{toast.label}</b> geturfd
          </span>
          <button
            onClick={() => {
              const e = entries.find((x) => x.id === toast.ids[0])
              if (e) setEdit(e)
              setToast(null)
            }}
          >
            + adres
          </button>
          <button onClick={undo}>Ongedaan</button>
        </div>
      )}

      {ask && (
        <AskSheet
          a={ask.a}
          onClose={() => setAsk(null)}
          onSubmit={(v) => {
            buzz()
            const e = addEntry({ work_date: date, activity_code: ask.a.code, ...v })
            setAsk(null)
            showToast({ ids: [e.id], label: ask.a.short })
          }}
        />
      )}

      {edit && <EditSheet e={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function Tile({ a, onClick }: { a: Activity; onClick: () => void }) {
  return (
    <button className={`btn-tile tone-${a.tone}`} onClick={onClick}>
      <span className="tile-name">{a.short}</span>
      <span className="tile-price">
        {a.unit === 'bedrag' ? 'bedrag' : money(a.price)}
        {a.unit === 'uur' && <small> /uur</small>}
      </span>
    </button>
  )
}

function EntryRow({ e, onClick }: { e: Entry; onClick: () => void }) {
  const a = activity(e.activity_code)
  const time = new Date(e.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return (
    <li>
      <button className="entry" onClick={onClick}>
        <span className={`dot tone-${a.tone}`} />
        <span className="entry-main">
          <span className="entry-name">
            {a.unit === 'uur' ? `${num(e.quantity)} uur ` : ''}
            {a.short}
          </span>
          <span className="entry-sub">
            {time}
            {e.reason && ` · ${e.reason}`}
            {e.address && ` · ${e.address}`}
          </span>
        </span>
        <span className="entry-amount">{money(amountOf(e))}</span>
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
            <button key={r} className="btn-reason" onClick={() => onSubmit({ reason: r })}>
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
        className="ask-form"
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

function EditSheet({ e, onClose }: { e: Entry; onClose: () => void }) {
  const a = activity(e.activity_code)
  const [address, setAddress] = useState(e.address ?? '')
  const [code, setCode] = useState(e.activity_code)
  const [reason, setReason] = useState(e.reason ?? '')
  const [qty, setQty] = useState(num(a.unit === 'bedrag' ? e.unit_price : e.quantity))
  const cur = activity(code)

  const save = () => {
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
    <Sheet title="Regel aanpassen" onClose={onClose}>
      <div className="ask-form">
        <label className="field">
          <span>Adres / werkorder (optioneel)</span>
          <input
            autoFocus
            value={address}
            onChange={(ev) => setAddress(ev.target.value)}
            placeholder="bv. 4337TR-340"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </label>
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
        {cur.reasons && (
          <div className="chips">
            {cur.reasons.map((r) => (
              <button type="button" key={r} className={`chip ${(reason || cur.reasons![0]) === r ? 'is-on' : ''}`} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        )}
        {cur.unit !== 'stuks' && (
          <label className="field">
            <span>{cur.unit === 'uur' ? 'Aantal uur' : 'Bedrag in euro'}</span>
            <input inputMode="decimal" value={qty} onChange={(ev) => setQty(ev.target.value)} />
          </label>
        )}
        <button className="btn-primary" onClick={save}>
          Opslaan
        </button>
        <button
          className="btn-danger"
          onClick={() => {
            removeEntry(e.id)
            onClose()
          }}
        >
          Verwijderen
        </button>
      </div>
    </Sheet>
  )
}
