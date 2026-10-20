import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

// Supabase geeft Engelse meldingen; de bekende vertalen we.
export const authError = (m: string) =>
  ({
    'Invalid login credentials': 'E-mail of wachtwoord klopt niet.',
    'Email not confirmed': 'Je e-mail is nog niet bevestigd. Check je mail.',
    'email rate limit exceeded': 'Er zijn te veel mails verstuurd. Probeer het over een uur opnieuw.',
    'New password should be different from the old password.': 'Kies een ander wachtwoord dan je huidige.',
  })[m] ?? m

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
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
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
      setBusy(false)
      return setMsg(error ? authError(error.message) : 'Check je mail en tik op de link om een nieuw wachtwoord te kiezen.')
    }
    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: location.origin } })
    setBusy(false)
    if (error) setMsg(authError(error.message))
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
        {mode !== 'reset' && (
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
        )}
        {msg && <p className="form-msg">{msg}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Even geduld…' : { login: 'Inloggen', signup: 'Account maken', reset: 'Stuur resetlink' }[mode]}
        </button>
        {mode === 'login' && (
          <button type="button" className="btn-link" onClick={() => (setMode('reset'), setMsg(null))}>
            Wachtwoord vergeten?
          </button>
        )}
        <button type="button" className="btn-link" onClick={() => (setMode(mode === 'login' ? 'signup' : 'login'), setMsg(null))}>
          {mode === 'login' ? 'Nog geen account? Maak er een' : mode === 'signup' ? 'Al een account? Inloggen' : 'Terug naar inloggen'}
        </button>
      </form>
    </div>
  )
}
