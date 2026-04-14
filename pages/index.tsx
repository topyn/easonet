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
    fetch('/api/auth/session').then(r => {
      if (r.ok) router.replace('/app')
    })
  }, [router])

  async function submit() {
    setLoading(true)
    setError('')
    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Something went wrong'); return }
    if (mode === 'signup') {
      setMode('login')
      setError('Account created — please log in')
    } else {
      router.push('/app')
    }
  }

  const s: Record<string, any> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4', fontFamily: 'system-ui,sans-serif' },
    card: { background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: 16, padding: '40px 36px', width: 360, display: 'flex', flexDirection: 'column', gap: 16 },
    logo: { fontSize: 22, fontWeight: 700, color: '#534AB7', marginBottom: 4 },
    tagline: { fontSize: 14, color: '#888', marginBottom: 8 },
    label: { fontSize: 13, color: '#555', marginBottom: 4, display: 'block' },
    input: { width: '100%', padding: '10px 12px', border: '0.5px solid #d0cdc6', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    btn: { padding: 11, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' },
    toggle: { fontSize: 13, color: '#888', textAlign: 'center' as const },
    link: { color: '#534AB7', cursor: 'pointer', textDecoration: 'underline' },
    err: (isSuccess: boolean) => ({ fontSize: 13, color: isSuccess ? '#0F6E56' : '#E24B4A', background: isSuccess ? '#E1F5EE' : '#FCEBEB', padding: '8px 12px', borderRadius: 8 }),
  }

  const isSuccess = error.includes('created')

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div>
          <div style={s.logo}>easonet</div>
          <div style={s.tagline}>One inbox, every brand</div>
        </div>
        {error && <div style={s.err(isSuccess)}>{error}</div>}
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
          {mode === 'login'
            ? <><span>No account? </span><span style={s.link} onClick={() => { setMode('signup'); setError('') }}>Sign up free</span> — 30 day trial</>
            : <><span>Already have an account? </span><span style={s.link} onClick={() => { setMode('login'); setError('') }}>Log in</span></>
          }
        </div>
      </div>
    </div>
  )
}
