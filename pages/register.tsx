import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import MarketingLayout, { PRICE } from '../components/marketing/MarketingLayout'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', business: '', website: '', sells: '', company: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending'); setError('')
    try {
      const res = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Something went wrong — please try again'); setState('idle'); return }
      setState('done')
    } catch {
      setError('Could not reach easonet — check your connection and try again')
      setState('idle')
    }
  }

  return (
    <MarketingLayout
      path="/register"
      title="Register your interest | easonet"
      description={`Be one of the first shops on easonet: a working online shop on your own domain, plus a community. ${PRICE}/month, everything included.`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .rg-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: start; }
        .rg-form { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 32px; display: grid; gap: 18px; }
        .rg-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .rg-error { background: #FBE4DE; color: #8A2A12; border-radius: 10px; padding: 10px 14px; font-size: 15px; }
        .rg-small { font-size: 14px; color: var(--muted); }
        .rg-small a { color: var(--accent); }
        .rg-done { background: var(--teal-soft); border-radius: 20px; padding: 40px 32px; }
        @media (max-width: 900px) { .rg-grid { grid-template-columns: 1fr; gap: 32px; } }
        @media (max-width: 640px) { .rg-form { padding: 22px 18px; } }
      ` }} />

      <section className="mk-section">
        <div className="mk-wrap rg-grid">
          <div>
            <div className="mk-eyebrow">Register interest</div>
            <h1 className="mk-h1">Be one of the first shops on easonet.</h1>
            <p className="mk-lead">We're opening to a small group of shops first, so we can set each one up properly. Tell us a little about your business and we'll get in touch personally.</p>
            <ul className="mk-ticks" style={{ marginTop: 28 }}>
              <li>Your shop on your own domain</li>
              <li>Everything included for {PRICE} a month</li>
              <li>A community of shop owners behind you</li>
              <li>No payment needed to register</li>
            </ul>
          </div>

          {state === 'done' ? (
            <div className="rg-done" role="status">
              <h2 className="mk-h2" style={{ fontSize: 32 }}>Thanks, you're on the list.</h2>
              <p className="mk-lead">We'll be in touch at <b>{form.email}</b> soon. In the meantime, have a look at <Link href="/features" style={{ color: 'var(--teal)' }}>everything that's included</Link>.</p>
            </div>
          ) : (
            <form className="rg-form" onSubmit={submit} noValidate={false}>
              <div className="mk-field">
                <label htmlFor="rg-name">Your name</label>
                <input id="rg-name" className="mk-input" required maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} />
              </div>
              <div className="mk-field">
                <label htmlFor="rg-email">Email</label>
                <input id="rg-email" type="email" className="mk-input" required maxLength={200} autoComplete="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="mk-field">
                <label htmlFor="rg-business">Business name <span className="hint">(optional)</span></label>
                <input id="rg-business" className="mk-input" maxLength={120} autoComplete="organization" value={form.business} onChange={set('business')} />
              </div>
              <div className="mk-field">
                <label htmlFor="rg-website">Your domain or current website <span className="hint">(optional)</span></label>
                <input id="rg-website" className="mk-input" maxLength={200} placeholder="e.g. yourshop.com.au" value={form.website} onChange={set('website')} />
              </div>
              <div className="mk-field">
                <label htmlFor="rg-sells">What do you sell? <span className="hint">(optional)</span></label>
                <textarea id="rg-sells" className="mk-input" rows={4} maxLength={1000} value={form.sells} onChange={set('sells')} />
              </div>
              <div className="rg-hp" aria-hidden="true">
                <label htmlFor="rg-company">Company</label>
                <input id="rg-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} />
              </div>
              {error && <div className="rg-error" role="alert">{error}</div>}
              <button type="submit" className="mk-btn mk-btn-lg" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Register interest →'}
              </button>
              <p className="rg-small">We'll only use your details to contact you about easonet. See our <Link href="/privacy">privacy note</Link>.</p>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  )
}
