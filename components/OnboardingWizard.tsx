import { useState, useEffect, useCallback } from 'react'

const BG = '#080808', BG2 = '#101010', BG3 = '#161616'
const BORDER = 'rgba(255,255,255,0.08)', TEXT = '#f0f0ee', MUTED = '#666', ACCENT = '#7B6EF6'
const GREEN = '#3ECF8E', AMBER = '#F5A623', RED = '#ff6b6b'

interface Step { mx: boolean; spf: boolean; dkim: boolean }

interface WizardProps {
  onComplete: (identity: { name: string; email: string; domain: string; color: string }) => void
  onCancel: () => void
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
}

const PROVIDER_NAMES: Record<string, string> = {
  cloudflare: 'Cloudflare', godaddy: 'GoDaddy', namecheap: 'Namecheap',
  squarespace: 'Squarespace', google: 'Google Domains', hover: 'Hover', other: 'your DNS provider',
}

const COLORS = ['#7B6EF6','#3ECF8E','#F5A623','#60A5FA','#F87171','#A78BFA','#34D399','#FB923C']

export default function OnboardingWizard({ onComplete, onCancel, authFetch }: WizardProps) {
  const [step, setStep] = useState<'domain' | 'dns' | 'details' | 'success'>('domain')
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [color, setColor] = useState('#7B6EF6')
  const [provider, setProvider] = useState('')
  const [isOnCloudflare, setIsOnCloudflare] = useState(false)
  const [dnsSteps, setDnsSteps] = useState<Step>({ mx: false, spf: false, dkim: false })
  const [detecting, setDetecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [polling, setPolling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (domain && !email) setEmail(`mark@${domain}`) }, [domain])

  async function detectDns() {
    if (!domain) return
    setDetecting(true); setError('')
    try {
      const res = await fetch(`/api/identities/detect-dns?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      setProvider(data.provider || 'other')
      setIsOnCloudflare(data.isOnCloudflare)
      setDnsSteps(data.steps || { mx: false, spf: false, dkim: false })
      if (data.allDone) setStep('details')
      else setStep('dns')
    } catch { setError('Could not check DNS. Please verify your domain name.') }
    setDetecting(false)
  }

  const checkDns = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/identities/detect-dns?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      setDnsSteps(data.steps || { mx: false, spf: false, dkim: false })
      if (data.allDone) { setPolling(false); setStep('details') }
    } catch {}
    setChecking(false)
  }, [domain])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(checkDns, 15000)
    return () => clearInterval(interval)
  }, [polling, checkDns])

  async function createIdentity() {
    if (!name || !email) return
    setSaving(true)
    const res = await authFetch('/api/identities', {
      method: 'POST',
      body: JSON.stringify({ name, email, color }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to create identity'); return }
    setStep('success')
    setTimeout(() => onComplete({ name, email, domain, color }), 2000)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, color: TEXT, outline: 'none', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box' as const }
  const btn: React.CSSProperties = { padding: '11px 24px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }
  const ghost: React.CSSProperties = { padding: '11px 20px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: MUTED, fontFamily: "'DM Sans',sans-serif" }

  const providerName = PROVIDER_NAMES[provider] || 'your DNS provider'

  const DNS_RECORDS: Record<string, { title: string; records: { label: string; type: string; name: string; value: string; note?: string }[] }> = {
    cloudflare: {
      title: `Great — your domain is on Cloudflare. This is the easiest setup.`,
      records: [
        { label: 'Enable Email Routing', type: '', name: '', value: '', note: 'Cloudflare dashboard → your domain → Email → Email Routing → Enable. Add a routing rule: mark@yourdomain.com → forward to your personal email.' },
        { label: 'SPF record', type: 'TXT', name: '@', value: 'v=spf1 include:_spf.brevo.com include:_spf.mx.cloudflare.net ~all', note: 'If you already have an SPF record, merge these includes — never add two SPF records.' },
        { label: 'DKIM 1', type: 'CNAME', name: 'brevo1._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → your domain → Authenticate' },
        { label: 'DKIM 2', type: 'CNAME', name: 'brevo2._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → your domain → Authenticate' },
      ]
    },
    godaddy: {
      title: `Your domain is with GoDaddy. Add these records in your GoDaddy DNS settings.`,
      records: [
        { label: 'MX record', type: 'MX', name: '@', value: 'route1.mx.cloudflare.net', note: 'Priority: 13. Delete any existing GoDaddy MX records (secureserver.net) first. You\'ll also need Cloudflare Email Routing enabled at cloudflare.com (free account).' },
        { label: 'SPF record', type: 'TXT', name: '@', value: 'v=spf1 include:_spf.brevo.com ~all', note: 'If you already have an SPF record, add include:_spf.brevo.com to it rather than adding a second one.' },
        { label: 'DKIM 1', type: 'CNAME', name: 'brevo1._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → your domain → Authenticate' },
        { label: 'DKIM 2', type: 'CNAME', name: 'brevo2._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → your domain → Authenticate' },
      ]
    },
    namecheap: {
      title: `Your domain is with Namecheap. Go to Advanced DNS to add these records.`,
      records: [
        { label: 'MX record', type: 'MX', name: '@', value: 'route1.mx.cloudflare.net', note: 'Priority: 13. You\'ll also need Cloudflare Email Routing at cloudflare.com (free).' },
        { label: 'SPF record', type: 'TXT', name: '@', value: 'v=spf1 include:_spf.brevo.com ~all' },
        { label: 'DKIM 1', type: 'CNAME', name: 'brevo1._domainkey', value: 'Copy from Brevo dashboard' },
        { label: 'DKIM 2', type: 'CNAME', name: 'brevo2._domainkey', value: 'Copy from Brevo dashboard' },
      ]
    },
    other: {
      title: `Add these DNS records with your domain registrar or DNS provider.`,
      records: [
        { label: 'MX record', type: 'MX', name: '@', value: 'route1.mx.cloudflare.net', note: 'Priority: 13. For inbound email you\'ll also need a free Cloudflare account with Email Routing enabled for your domain.' },
        { label: 'SPF record', type: 'TXT', name: '@', value: 'v=spf1 include:_spf.brevo.com ~all' },
        { label: 'DKIM 1', type: 'CNAME', name: 'brevo1._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → Authenticate' },
        { label: 'DKIM 2', type: 'CNAME', name: 'brevo2._domainkey', value: 'Copy from Brevo → Settings → Senders & Domains → Authenticate' },
      ]
    },
  }

  const currentDns = DNS_RECORDS[provider] || DNS_RECORDS.other

  return (
    <div onClick={e => e.target === e.currentTarget && onCancel()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
      <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
              {step === 'domain' ? '// step 1 of 3' : step === 'dns' ? '// step 2 of 3' : step === 'details' ? '// step 3 of 3' : '// done'}
            </div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -.5, color: TEXT }}>
              {step === 'domain' && 'Add a brand email'}
              {step === 'dns' && `Set up ${domain}`}
              {step === 'details' && 'Name your identity'}
              {step === 'success' && 'Identity created!'}
            </div>
          </div>
          {step !== 'success' && <button onClick={onCancel} style={{ ...ghost, padding: '6px 12px', fontSize: 12 }}>Cancel</button>}
        </div>

        <div style={{ padding: '24px 28px' }}>
          {step !== 'success' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {['domain', 'dns', 'details'].map((s, i) => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 100, background: ['domain','dns','details'].indexOf(step) >= i ? ACCENT : 'rgba(255,255,255,.08)' }} />
              ))}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 'domain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75 }}>Enter the domain you want email for. We'll detect your DNS provider and show you exactly what to do — no guesswork.</p>
              {error && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: RED, background: `${RED}10`, border: `1px solid ${RED}30`, borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
              <div>
                <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Your domain</label>
                <input style={inp} placeholder="topyn.com" value={domain}
                  onChange={e => setDomain(e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim())}
                  onKeyDown={e => e.key === 'Enter' && domain && detectDns()} />
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#333', marginTop: 6 }}>// just the domain, no www</div>
              </div>
              <button onClick={detectDns} disabled={detecting || !domain} style={{ ...btn, opacity: detecting || !domain ? 0.5 : 1 }}>
                {detecting ? '// detecting DNS provider…' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── STEP 2 — DNS ── */}
          {step === 'dns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: BG3, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: `${ACCENT}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontSize: 14, color: ACCENT, flexShrink: 0 }}>◈</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>Detected: {providerName}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: MUTED }}>{domain}</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{currentDns.title}</p>

              {/* Status pills */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: 'mx' as keyof Step, label: 'MX' }, { key: 'spf' as keyof Step, label: 'SPF' }, { key: 'dkim' as keyof Step, label: 'DKIM' }].map(s => (
                  <div key={s.key} style={{ flex: 1, padding: '10px', background: dnsSteps[s.key] ? `${GREEN}0d` : BG3, border: `1px solid ${dnsSteps[s.key] ? GREEN : BORDER}`, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{dnsSteps[s.key] ? '✓' : '○'}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: dnsSteps[s.key] ? GREEN : MUTED }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Records */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentDns.records.map((r, i) => (
                  <div key={i} style={{ background: BG3, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: ACCENT, marginBottom: r.type ? 8 : 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      {r.type ? `${r.type} — ${r.label}` : r.label}
                    </div>
                    {r.type && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: r.note ? 10 : 0 }}>
                        {r.name && <div style={{ display: 'flex', gap: 12 }}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#444', minWidth: 44 }}>Name</span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: TEXT }}>{r.name}</span></div>}
                        <div style={{ display: 'flex', gap: 12 }}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#444', minWidth: 44 }}>Value</span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: TEXT, wordBreak: 'break-all' }}>{r.value}</span></div>
                      </div>
                    )}
                    {r.note && <div style={{ fontSize: 12, color: '#777', lineHeight: 1.65, paddingTop: r.type ? 10 : 0, borderTop: r.type ? `1px solid ${BORDER}` : 'none' }}>{r.note}</div>}
                  </div>
                ))}
              </div>

              {!isOnCloudflare && (
                <div style={{ background: `${AMBER}0a`, border: `1px solid ${AMBER}25`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: AMBER, marginBottom: 6 }}>// tip</div>
                  <p style={{ fontSize: 12, color: '#888', lineHeight: 1.65 }}>
                    Moving your domain to Cloudflare (free) makes the email setup much simpler and gives you better DNS management. Go to <a href="https://cloudflare.com" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>cloudflare.com</a> → Add site → follow the steps.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setPolling(true); checkDns() }} disabled={checking}
                  style={{ ...btn, flex: 1, opacity: checking ? 0.5 : 1 }}>
                  {checking ? '// checking…' : "I've added the records →"}
                </button>
                <button onClick={() => setStep('details')} style={ghost}>Skip</button>
              </div>
              {polling && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: MUTED, textAlign: 'center' }}>// checking every 15s · DNS takes up to 30 min</div>}
            </div>
          )}

          {/* ── STEP 3 — Details ── */}
          {step === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.values(dnsSteps).every(Boolean)
                ? <div style={{ background: `${GREEN}0a`, border: `1px solid ${GREEN}30`, borderRadius: 10, padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 12, color: GREEN }}>✓ DNS verified — {domain} is ready</div>
                : <div style={{ background: `${AMBER}0a`, border: `1px solid ${AMBER}25`, borderRadius: 10, padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 12, color: AMBER }}>⚠ DNS not fully verified yet — you can finish setup later</div>
              }
              {error && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: RED, background: `${RED}10`, border: `1px solid ${RED}30`, borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Brand / display name</label>
                  <input style={inp} placeholder="e.g. Topyn" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Email address</label>
                  <input style={inp} placeholder={`mark@${domain}`} value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Brand colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setColor(c)}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? `2px solid ${TEXT}` : '2px solid transparent', boxSizing: 'border-box' as const }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={createIdentity} disabled={saving || !name || !email}
                  style={{ ...btn, flex: 1, opacity: saving || !name || !email ? 0.5 : 1 }}>
                  {saving ? '// creating…' : 'Create identity →'}
                </button>
                <button onClick={() => setStep('dns')} style={ghost}>← Back</button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${GREEN}18`, border: `1px solid ${GREEN}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>✓</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -.5, color: GREEN, marginBottom: 8 }}>{name} is live!</div>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>You can now send and receive from {email}.<br/>Loading your inbox…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
