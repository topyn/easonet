import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const token = localStorage.getItem('easonet_token')
      if (token) router.replace('/app')
    } catch {}
  }, [])

  async function submit() {
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Signup failed'); setLoading(false); return }
        setMode('login')
        setError('Account created — please log in')
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
        if (data.access_token) {
          localStorage.setItem('easonet_token', data.access_token)
          localStorage.setItem('easonet_user', JSON.stringify(data.user))
        }
        router.push('/app')
      }
    } catch (err: any) {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  const isSuccess = typeof error === 'string' && error.includes('created')

  const s: Record<string, any> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', fontFamily: 'system-ui,sans-serif' },
    card: { background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: 16, padding: '40px 36px', width: 360, display: 'flex', flexDirection: 'column' as const, gap: 16 },
    logo: { fontSize: 22, fontWeight: 700, color: '#534AB7', marginBottom: 4 },
    tagline: { fontSize: 14, color: '#888', marginBottom: 8 },
    label: { fontSize: 13, color: '#555', marginBottom: 4, display: 'block' },
    input: { width: '100%', padding: '10px 12px', border: '0.5px solid #d0cdc6', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    btn: { padding: 11, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' },
    toggle: { fontSize: 13, color: '#888', textAlign: 'center' as const },
    link: { color: '#534AB7', cursor: 'pointer', textDecoration: 'underline' },
    err: { fontSize: 13, color: isSuccess ? '#0F6E56' : '#E24B4A', background: isSuccess ? '#E1F5EE' : '#FCEBEB', padding: '8px 12px', borderRadius: 8 },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div>
          <div style={s.logo}>easonet</div>
          <div style={s.tagline}>One inbox, every brand</div>
        </div>
        {error && <div style={s.err}>{error}</div>}
        <div>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <button style={s.btn} onClick={submit} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <div style={s.toggle}>
          {mode === 'login' ? (
            <><span>No account? </span><span style={s.link} onClick={() => { setMode('signup'); setError('') }}>Sign up free</span><span> — 30 day trial</span></>
          ) : (
            <><span>Already have an account? </span><span style={s.link} onClick={() => { setMode('login'); setError('') }}>Log in</span></>
          )}
        </div>
      </div>
    </div>
  )
}
