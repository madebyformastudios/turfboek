import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { sync, useStore } from './lib/store'
import { today } from './lib/period'
import { Today } from './components/Today'
import { Week } from './components/Week'
import { More } from './components/More'
import { Auth } from './components/Auth'

type Tab = 'today' | 'week' | 'more'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(today())
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const { outbox, online, syncing } = useStore()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
      void sync()
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
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

  if (!ready) return <div className="splash" />
  if (supabase && !session) return <Auth />

  const status = !online ? 'Offline' : syncing ? 'Synchroniseren…' : outbox.length ? `${outbox.length} wachtend` : null

  return (
    <div className="app">
      {status && <div className={`status-pill ${!online ? 'is-offline' : ''}`}>{status}</div>}
      <main className="screen">
        {tab === 'today' && <Today date={date} setDate={setDate} />}
        {tab === 'week' && <Week date={date} openDay={(d) => (setDate(d), setTab('today'))} />}
        {tab === 'more' && <More session={session} />}
      </main>
      <nav className="tabbar">
        <TabBtn active={tab === 'today'} onClick={() => setTab('today')} label="Turven" icon="▮▮▮" />
        <TabBtn active={tab === 'week'} onClick={() => setTab('week')} label="Factuurweek" icon="€" />
        <TabBtn active={tab === 'more'} onClick={() => setTab('more')} label="Meer" icon="•••" />
      </nav>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button className={`tab ${active ? 'is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span className="tab-icon" aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
