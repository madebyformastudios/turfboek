import { FormEvent, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ACTIVITIES, money } from '../lib/rates'
import { clearLocal, sync, useStore } from '../lib/store'
import { ThemePref, setTheme, useTheme } from '../lib/theme'
import { Icon, IconName } from './Icon'
import { Sheet } from './Sheet'
import { authError } from './Auth'

const THEMES: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Automatisch', icon: 'phone' },
  { value: 'light', label: 'Licht', icon: 'sun' },
  { value: 'dark', label: 'Donker', icon: 'moon' },
]

export function More({ session, name }: { session: Session | null; name: string }) {
  const { entries, outbox, lastSync, syncing, error } = useStore()
  const theme = useTheme()
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const [pw, setPw] = useState(false)

  const syncText = syncing
    ? 'Synchroniseren…'
    : outbox.length
      ? `${outbox.length} wijziging(en) wachten op internet`
      : lastSync
        ? `Opgeslagen in de cloud · ${new Date(lastSync).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
        : 'Nog niet gesynchroniseerd'

  return (
    <>
      <header className="profile">
        <span className="avatar is-large">{name ? name[0].toUpperCase() : <Icon name="user" size={30} />}</span>
        <div>
          <h1>{name || 'Turfen'}</h1>
          <p className="muted">{session?.user.email ?? 'Lokale modus · alleen op dit toestel'}</p>
        </div>
      </header>

      <h3 className="section-title">Weergave</h3>
      <div className="segmented" role="radiogroup" aria-label="Weergave">
        {THEMES.map((t) => (
          <button key={t.value} role="radio" aria-checked={theme === t.value} className={theme === t.value ? 'is-on' : ''} onClick={() => setTheme(t.value)}>
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>

      {supabase && session ? (
        <>
          <h3 className="section-title">Account</h3>
          <section className="card list-card">
            <div className="list-row">
              <span className="icon-sq tone-gas">
                <Icon name="sync" size={20} />
              </span>
              <span className="list-main">
                <b>{syncText}</b>
                {error && <span className="form-msg">Sync-fout: {error}</span>}
              </span>
            </div>
            <div className="btn-row">
              <button className="btn-soft" onClick={() => sync()}>
                Nu synchroniseren
              </button>
              <button
                className="btn-soft"
                onClick={async () => {
                  if (outbox.length && !confirm('Er staan nog wijzigingen klaar die niet verstuurd zijn. Toch uitloggen?')) return
                  await supabase!.auth.signOut()
                  clearLocal()
                }}
              >
                Uitloggen
              </button>
            </div>
            <button className="btn-soft is-wide" onClick={() => setPw(true)}>
              Wachtwoord wijzigen
            </button>
          </section>
          {pw && <PasswordSheet title="Wachtwoord wijzigen" onClose={() => setPw(false)} />}
        </>
      ) : (
        <>
          <h3 className="section-title">Opslag</h3>
          <section className="card">
          <p className="muted">Je {entries.length} regels staan alleen op dit toestel. Koppel Supabase (zie README) om te synchroniseren.</p>
          </section>
        </>
      )}

      {!standalone && (
        <>
          <h3 className="section-title">Op je beginscherm</h3>
          <section className="card list-card">
            <div className="list-row">
              <span className="icon-sq tone-elec">
                <Icon name="phone" size={20} />
              </span>
              <span className="list-main">
                <b>iPhone</b>
                <span className="muted">Open in Safari → deelknop → Zet op beginscherm</span>
              </span>
            </div>
          </section>
        </>
      )}

      <h3 className="section-title">Tarieven Circet · Stedin 2026</h3>
      <ul className="spec-list">
        {ACTIVITIES.map((a) => (
          <li key={a.code} className={`tone-${a.tone}`}>
            <span className="icon-sq">
              <Icon name={a.icon} size={18} />
            </span>
            <span className="spec-main">
              <span className="spec-name">{a.name}</span>
              <span className="spec-sub">Code {a.code}</span>
            </span>
            <span className="spec-amount">{a.unit === 'bedrag' ? 'variabel' : `${money(a.price)}${a.unit === 'uur' ? '/u' : ''}`}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Nieuw wachtwoord zetten; ook gebruikt na de resetlink uit de mail. */
export function PasswordSheet({ title, onClose }: { title: string; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (error) setMsg(authError(error.message))
    else setDone(true)
  }

  return (
    <Sheet title={title} onClose={onClose}>
      {done ? (
        <div className="form">
          <p className="muted">Je wachtwoord is gewijzigd.</p>
          <button className="btn-primary" onClick={onClose}>
            Klaar
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Nieuw wachtwoord (minstens 6 tekens)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
          </label>
          {msg && <p className="form-msg">{msg}</p>}
          <button className="btn-primary" disabled={busy || password.length < 6}>
            {busy ? 'Even geduld…' : 'Opslaan'}
          </button>
        </form>
      )}
    </Sheet>
  )
}
