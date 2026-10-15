import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ACTIVITIES, money } from '../lib/rates'
import { clearLocal, sync, useStore } from '../lib/store'
import { ThemePref, setTheme, useTheme } from '../lib/theme'
import { Icon, IconName } from './Icon'

const THEMES: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Automatisch', icon: 'phone' },
  { value: 'light', label: 'Licht', icon: 'sun' },
  { value: 'dark', label: 'Donker', icon: 'moon' },
]

export function More({ session, name }: { session: Session | null; name: string }) {
  const { entries, outbox, lastSync, syncing, error } = useStore()
  const theme = useTheme()
  const standalone = window.matchMedia('(display-mode: standalone)').matches

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
          <h3 className="section-title">Synchronisatie</h3>
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
          </section>
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
            <div className="list-row">
              <span className="icon-sq tone-hour">
                <Icon name="phone" size={20} />
              </span>
              <span className="list-main">
                <b>Android</b>
                <span className="muted">Chrome-menu ⋮ → App installeren</span>
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
      <p className="hint">Combi-gas staat op de factuur als € 10,098. De factuurweek loopt van vrijdag t/m donderdag.</p>
    </>
  )
}
