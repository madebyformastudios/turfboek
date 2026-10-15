import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ACTIVITIES, money } from '../lib/rates'
import { clearLocal, sync, useStore } from '../lib/store'

export function More({ session }: { session: Session | null }) {
  const { entries, outbox, lastSync, syncing, error } = useStore()
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  return (
    <>
      <h1 className="page-title">Meer</h1>

      <section className="card">
        <h3>Account</h3>
        {supabase && session ? (
          <>
            <p>
              Ingelogd als <b>{session.user.user_metadata.display_name || session.user.email}</b>
              <br />
              <span className="muted">{session.user.email}</span>
            </p>
            <p className="muted">
              {syncing
                ? 'Synchroniseren…'
                : outbox.length
                  ? `${outbox.length} wijziging(en) wachten op internet`
                  : lastSync
                    ? `Gesynchroniseerd om ${new Date(lastSync).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Nog niet gesynchroniseerd'}
            </p>
            {error && <p className="form-msg">Sync-fout: {error}</p>}
            <div className="row-2">
              <button className="btn-secondary" onClick={() => sync()}>Nu synchroniseren</button>
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (outbox.length && !confirm('Er staan nog wijzigingen klaar die niet verstuurd zijn. Toch uitloggen?')) return
                  await supabase!.auth.signOut()
                  clearLocal()
                }}
              >
                Uitloggen
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            Lokale modus: je {entries.length} regels staan alleen op dit toestel. Koppel Supabase (zie README) om te synchroniseren en collega's een eigen account te geven.
          </p>
        )}
      </section>

      {!standalone && (
        <section className="card">
          <h3>Op je beginscherm zetten</h3>
          <p className="muted">
            <b>iPhone:</b> open in Safari → deel-knop → <i>Zet op beginscherm</i>.<br />
            <b>Android:</b> Chrome-menu ⋮ → <i>App installeren</i>.
          </p>
          <p className="muted">Daarna opent Turfen als een gewone app en werkt hij ook zonder bereik.</p>
        </section>
      )}

      <section className="card">
        <h3>Tarieven Circet – Stedin 2026</h3>
        <table className="spec">
          <tbody>
            {ACTIVITIES.map((a) => (
              <tr key={a.code}>
                <td>
                  <span className={`dot tone-${a.tone}`} />
                  {a.name}
                </td>
                <td className="r">{a.unit === 'bedrag' ? 'variabel' : `${money(a.price)}${a.unit === 'uur' ? '/u' : ''}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Combi-gas staat op de factuur als € 10,098. Factuurweek loopt vrijdag t/m donderdag.</p>
      </section>
    </>
  )
}
