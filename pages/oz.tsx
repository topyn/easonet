// pages/oz.tsx — landing page for the OzStorehouse portal's "✉️ Email" button. Reads the
// one-time code from the #fragment (never sent to any server log), swaps it for a session
// (/api/auth/oz-handoff) and opens the inbox.

import { useEffect, useState } from 'react'
import Head from 'next/head'
import { setTokens } from '../lib/auth-client'

export default function FromOz() {
  const [error, setError] = useState('')

  useEffect(() => {
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code') || ''
    history.replaceState(null, '', '/oz') // drop the code from the address bar and history
    if (!code) { setError('That link is incomplete — open Email from your OzStorehouse portal again.'); return }
    fetch('/api/auth/oz-handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d.access_token) { setError(d.error || 'Couldn’t sign you in — please try again.'); return }
        setTokens(d.access_token, d.refresh_token, d.user)
        window.location.replace('/app')
      })
      .catch(() => setError('Couldn’t reach easonet — check your connection and try again.'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#F7F3EE', color: '#1C1A17', padding: 24 }}>
      <Head><title>Opening your email…</title><meta name="robots" content="noindex" /></Head>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {error ? (
          <>
            <p style={{ fontSize: 17, lineHeight: 1.6 }}>{error}</p>
            <a href="https://www.ozstorehouse.com/seller-portal" style={{ color: '#C8873A', fontWeight: 600 }}>Back to your portal</a>
          </>
        ) : (
          <p style={{ fontSize: 17 }}>Opening your email…</p>
        )}
      </div>
    </div>
  )
}
