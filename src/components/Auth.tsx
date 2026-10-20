import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin } })
    setBusy(false)
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'E-mail of wachtwoord klopt niet.' : error.message)
    else if (mode === 'signup' && !data.session) setMsg('Check je mail om je account te bevestigen, log daarna in.')
  }

  return (
    <div className="auth">
      <img src="/icon.svg" alt="" className="auth-logo" />
      <h1>Turfen</h1>
      <p className="muted">Meterwissels bijhouden per factuurweek.</p>
      <form className="form" onSubmit={submit}>
        {mode === 'signup' && (
          <label className="field">
            <span>Naam</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
        )}
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Wachtwoord</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>
        {msg && <p className="form-msg">{msg}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Even geduld…' : mode === 'login' ? 'Inloggen' : 'Account maken'}
        </button>
        <button type="button" className="btn-link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Nog geen account? Maak er een' : 'Al een account? Inloggen'}
        </button>
      </form>
    </div>
  )
}
