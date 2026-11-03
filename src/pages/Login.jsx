import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { DiscIcon } from '../components/Icons.jsx'

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
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
          if (error) setError('Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch?')
          setBusy(false)
        }}
      >
        <input className="text-input" type="email" autoComplete="username" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="text-input" type="password" autoComplete="current-password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Anmelden …' : 'Anmelden'}</button>
      </form>
    </div>
  )
}
