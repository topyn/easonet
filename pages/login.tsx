import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function LoginPage() {
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
          const expiry = Date.now() + 55 * 60 * 1000
          localStorage.setItem('easonet_token', data.access_token)
          localStorage.setItem('easonet_refresh_token', data.refresh_token || '')
          localStorage.setItem('easonet_user', JSON.stringify(data.user))
          localStorage.setItem('easonet_token_expiry', String(expiry))
        }
        router.push('/app')
      }
    } catch { setError('Something went wrong') }
    setLoading(false)
  }

  const isSuccess = typeof error === 'string' && error.includes('created')

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Sign in' : 'Create account'} — Easonet</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #080808; font-family: 'DM Sans', sans-serif; min-height: 100vh;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        input:focus { border-color: rgba(123,110,246,0.5) !important; }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

        {/* Back link */}
        <a href="/" style={{ position: 'fixed', top: 24, left: 32, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', textDecoration: 'none', letterSpacing: '.05em' }}>
          ← easonet
        </a>

        {/* Logo */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, color: '#f0f0ee' }}>
            ease<span style={{ color: '#7B6EF6' }}>.</span>net
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginTop: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            // multi-brand toolkit
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#f0f0ee', letterSpacing: -0.5, marginBottom: 6 }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </div>
            <div style={{ fontSize: 13, color: '#444' }}>
              {mode === 'login' ? 'Sign in to your inbox' : '30 days free — no card required'}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: isSuccess ? '#3ECF8E' : '#ff6b6b', background: isSuccess ? 'rgba(62,207,142,0.08)' : 'rgba(255,107,107,0.08)', border: `1px solid ${isSuccess ? 'rgba(62,207,142,0.2)' : 'rgba(255,107,107,0.2)'}`, padding: '10px 14px', borderRadius: 8, fontFamily: "'DM Mono', monospace" }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
              { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: 'Min 8 characters' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  onKeyDown={f.type === 'password' ? e => e.key === 'Enter' && submit() : undefined}
                  style={{ width: '100%', padding: '11px 14px', background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: '#f0f0ee', outline: 'none', fontFamily: "'DM Sans', sans-serif", transition: 'border-color .2s' }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading}
            style={{ padding: '12px', background: loading ? '#1a1a1a' : '#7B6EF6', color: loading ? '#444' : '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background .2s' }}
          >
            {loading ? '// please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: '#333' }}>
            {mode === 'login' ? (
              <>No account?{' '}<span onClick={() => { setMode('signup'); setError('') }} style={{ color: '#7B6EF6', cursor: 'pointer' }}>Sign up free</span></>
            ) : (
              <>Already have an account?{' '}<span onClick={() => { setMode('login'); setError('') }} style={{ color: '#7B6EF6', cursor: 'pointer' }}>Sign in</span></>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#1e1e1e', textAlign: 'center' }}>
          © 2026 easonet
        </div>
      </div>
    </>
  )
}
