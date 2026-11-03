import { useState } from 'react'
import { supabase, SUPABASE_URL } from '../lib/supabase.js'
import { DiscIcon } from '../components/Icons.jsx'

function loginError(error) {
  const msg = error?.message ?? String(error)
  if (/invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort falsch.'
  if (/email not confirmed/i.test(msg)) return 'Der Nutzer ist in Supabase noch nicht bestätigt (Authentication → Users → Confirm).'
  if (/failed to fetch|network|load failed/i.test(msg)) return `Supabase nicht erreichbar. Stimmt VITE_SUPABASE_URL? (${msg})`
  if (/api key|apikey|jwt/i.test(msg)) return `Der Supabase-Key wird abgelehnt. Stimmt VITE_SUPABASE_ANON_KEY? (${msg})`
  return `Anmeldung fehlgeschlagen: ${msg}`
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="login">
      <DiscIcon width={64} height={64} />
      <h1>Vinyl Collector</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
            if (error) setError(loginError(error))
          } catch (err) {
            setError(loginError(err))
          }
          setBusy(false)
        }}
      >
        <input className="text-input" type="email" autoComplete="username" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="text-input" type="password" autoComplete="current-password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <p className="muted small">Server: {SUPABASE_URL}</p>
        <button className="btn primary block" disabled={busy}>{busy ? 'Anmelden …' : 'Anmelden'}</button>
      </form>
    </div>
  )
}
