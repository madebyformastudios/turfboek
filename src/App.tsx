import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { sync, useStore } from './lib/store'
import { today } from './lib/period'
import { Today } from './components/Today'
import { Week } from './components/Week'
import { More, PasswordSheet } from './components/More'
import { Auth } from './components/Auth'
import { Icon, IconName } from './components/Icon'

type Tab = 'today' | 'week' | 'more'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(today())
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [recovery, setRecovery] = useState(false)
  const { outbox, online, syncing } = useStore()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
      void sync()
    })
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      void sync()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Na middernacht weer op "vandaag" springen als de app lang open stond.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setDate((d) => (d < today() ? today() : d))
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!ready) return <div className="splash" />
  if (supabase && !session) return <Auth />

  const name: string = session?.user.user_metadata.display_name || session?.user.email?.split('@')[0] || ''
  const status = !online ? 'Offline' : syncing ? 'Synchroniseren…' : outbox.length ? `${outbox.length} wachtend` : null

  return (
    <div className="app">
      {status && <div className={`status-pill ${!online ? 'is-offline' : ''}`}>{status}</div>}
      <main className="screen">
        {tab === 'today' && <Today date={date} setDate={setDate} name={name} openMore={() => setTab('more')} />}
        {tab === 'week' && <Week date={date} openDay={(d) => (setDate(d), setTab('today'))} who={[name, session?.user.email].filter(Boolean).join(' · ')} />}
        {tab === 'more' && <More session={session} name={name} />}
      </main>
      <nav className="tabbar">
        <TabBtn active={tab === 'today'} onClick={() => setTab('today')} label="Turven" icon="tally" />
        <TabBtn active={tab === 'week'} onClick={() => setTab('week')} label="Factuurweek" icon="chart" />
        <TabBtn active={tab === 'more'} onClick={() => setTab('more')} label="Profiel" icon="user" />
      </nav>
      {recovery && <PasswordSheet title="Kies een nieuw wachtwoord" onClose={() => setRecovery(false)} />}
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: IconName }) {
  return (
    <button className={`tab ${active ? 'is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span className="tab-icon">
        <Icon name={icon} size={22} />
      </span>
      <span>{label}</span>
    </button>
  )
}
