import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

interface WaitlistInfo {
  name: string; slug: string; headline: string; description?: string
  buttonText: string; showCount: boolean; active: boolean; count: number
}

export default function WaitlistPage() {
  const router = useRouter()
  const { slug } = router.query
  const [info, setInfo] = useState<WaitlistInfo | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/waitlists/info?slug=${slug}`).then(r => r.json()).then(data => { setInfo(data); setCount(data.count) })
  }, [slug])

  async function submit() {
    if (!email || !slug) return
    setLoading(true); setError('')
    const res = await fetch('/api/waitlists/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, email, name }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Something went wrong'); return }
    setMessage(data.message); setCount(data.count); setSubmitted(true)
  }

  if (!info) return <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>// loading…</div>

  return (
    <>
      <Head>
        <title>{info.headline} — {info.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #080808; color: #f0f0ee; font-family: 'DM Sans', sans-serif; } body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; } input:focus { outline: none; border-color: rgba(123,110,246,0.5) !important; }`}</style>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginBottom: 20, letterSpacing: '.05em' }}>{info.name}</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 6vw, 52px)', letterSpacing: -2, lineHeight: 1.05, marginBottom: 14 }}>{info.headline}</h1>
            {info.description && <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7 }}>{info.description}</p>}
          </div>
          {info.showCount && count > 0 && !submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {[...Array(Math.min(5, count))].map((_, i) => (
                  <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: ['#7B6EF6','#3ECF8E','#F5A623','#60A5FA','#F87171'][i], border: '2px solid #080808', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff' }}>{String.fromCharCode(65 + i)}</div>
                ))}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555' }}>{count} {count === 1 ? 'person' : 'people'} waiting</div>
            </div>
          )}
          {!submitted ? (
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', padding: '10px 14px', borderRadius: 8 }}>{error}</div>}
              <input type="text" placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} style={{ padding: '11px 14px', background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif", transition: 'border-color .2s' }} />
              <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={{ padding: '11px 14px', background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif", transition: 'border-color .2s' }} />
              <button onClick={submit} disabled={loading || !email} style={{ padding: '12px', background: loading ? '#1a1a1a' : '#7B6EF6', color: loading ? '#444' : '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading || !email ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {loading ? '// joining…' : info.buttonText}
              </button>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#2a2a2a', textAlign: 'center' }}>no spam, ever. unsubscribe anytime.</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: -0.5, marginBottom: 8, color: '#3ECF8E' }}>You're on the list</div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 12 }}>{message}</div>
              {info.showCount && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E' }}>// {count} {count === 1 ? 'person' : 'people'} waiting</div>}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <a href="https://easonet.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#222' }}>powered by easonet</a>
          </div>
        </div>
      </div>
    </>
  )
}
