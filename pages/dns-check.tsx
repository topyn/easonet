import Head from 'next/head'
import { useState } from 'react'

type Status = 'ok' | 'wrong' | 'missing' | 'needs-update' | 'partial'

interface Conflict { type: string; severity: 'error' | 'warning'; message: string; fix: string }
interface DnsResult {
  domain: string
  currentProvider: string
  aRecords: string[]
  conflicts: Conflict[]
  hasErrors: boolean
  hasWarnings: boolean
  mx: { records: {exchange: string; priority: number}[]; hasCloudflareRouting: boolean; status: Status }
  spf: { record: string | null; allRecords: string[]; hasBrevoSpf: boolean; status: Status }
  dkim: { brevo1: boolean; brevo2: boolean; status: Status }
  dmarc: { record: string | null; status: Status }
  allGood: boolean
}

const STATUS_COLORS: Record<Status, { bg: string; border: string; text: string; label: string }> = {
  ok:           { bg: 'rgba(62,207,142,0.08)',  border: 'rgba(62,207,142,0.25)',  text: '#3ECF8E', label: '✓ Good' },
  wrong:        { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.25)', text: '#ff6b6b', label: '✗ Wrong provider' },
  missing:      { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.25)', text: '#ff6b6b', label: '✗ Missing' },
  'needs-update': { bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)',  text: '#F5A623', label: '⚠ Needs update' },
  partial:      { bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)',  text: '#F5A623', label: '⚠ Partial' },
}

const FIX_INSTRUCTIONS: Record<string, Record<Status, string | null>> = {
  mx: {
    ok: null,
    wrong: 'Your MX records point to a different email provider. To use easonet inbound email, replace your current MX records with: route1.mx.cloudflare.net (priority 13). Note: this will stop email flowing through your current provider.',
    missing: 'No MX records found. Add an MX record pointing to route1.mx.cloudflare.net with priority 13.',
    'needs-update': null,
    partial: null,
  },
  spf: {
    ok: null,
    missing: 'No SPF record found. Add a TXT record with value: v=spf1 include:_spf.brevo.com ~all',
    'needs-update': 'You have an SPF record but it doesn\'t include Brevo. Edit your existing SPF record and add include:_spf.brevo.com before the ~all. Example: v=spf1 include:_spf.brevo.com ~all',
    wrong: null,
    partial: null,
  },
  dkim: {
    ok: null,
    missing: 'Brevo DKIM records not found. In your Brevo dashboard go to Senders & IP → Domains → click Authenticate next to your domain and follow the instructions.',
    partial: 'Only one of two Brevo DKIM records found. Check your Brevo dashboard for the missing record.',
    wrong: null,
    'needs-update': null,
  },
  dmarc: {
    ok: null,
    missing: 'No DMARC record found. While not strictly required, it improves deliverability. Add a TXT record for _dmarc.yourdomain.com with value: v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com',
    wrong: null,
    'needs-update': null,
    partial: null,
  },
}

export default function DnsCheckPage() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DnsResult | null>(null)
  const [error, setError] = useState('')

  async function check() {
    if (!domain.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch(`/api/tools/dns-lookup?domain=${encodeURIComponent(domain.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to check DNS'); return }
      setResult(data)
    } catch { setError('Something went wrong — please try again') }
    finally { setLoading(false) }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const Section = ({ title, status, children }: { title: string; status: Status; children: React.ReactNode }) => {
    const s = STATUS_COLORS[status]
    return (
      <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: s.text, background: s.bg, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: 100 }}>{s.label}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    )
  }

  const RecordLine = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', minWidth: 100 }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#f0f0ee', flex: 1, wordBreak: 'break-all' }}>{value}</div>
      <button onClick={() => copy(value)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '2px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#555', flexShrink: 0 }}>copy</button>
    </div>
  )

  const FixBox = ({ text }: { text: string }) => (
    <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 8 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>// how to fix</div>
      <div style={{ fontSize: 13, color: '#999', lineHeight: 1.7 }}>{text}</div>
    </div>
  )

  return (
    <>
      <Head>
        <title>DNS Checker — Easonet</title>
        <meta name="description" content="Check your domain's DNS records for email setup. See if your MX, SPF, DKIM and DMARC records are configured correctly for easonet." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #f0f0ee; font-family: 'DM Sans', sans-serif; font-weight: 300; line-height: 1.6; }
        body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
        a { color: inherit; text-decoration: none; }
        input:focus { outline: none; border-color: rgba(123,110,246,0.5) !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', height: 60, background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>easonet</a>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/setup" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555' }}>setup guide</a>
          <a href="/dns-check" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6' }}>dns checker</a>
          <a href="/login" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '7px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#888' }}>sign in</a>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '100px 40px 80px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 16 }}>// dns checker</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: -2, lineHeight: 1, marginBottom: 16 }}>
            Check your domain's<br />email DNS records
          </h1>
          <p style={{ fontSize: 16, color: '#666', maxWidth: 480, lineHeight: 1.7 }}>
            Enter your domain and we'll check your MX, SPF, DKIM and DMARC records — and tell you exactly what needs fixing.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="yourdomain.com"
            style={{ flex: 1, padding: '13px 18px', background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 15, color: '#f0f0ee', fontFamily: "'DM Mono', monospace", transition: 'border-color .2s' }}
          />
          <button
            onClick={check}
            disabled={loading || !domain.trim()}
            style={{ padding: '13px 28px', background: loading ? '#1a1a1a' : '#7B6EF6', color: loading ? '#444' : '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: loading || !domain.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background .2s' }}
          >
            {loading ? '// checking…' : 'Check DNS →'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#ff6b6b', marginBottom: 24 }}>
            {error}
          </div>
        )}

        {result && (
          <div>
            {/* Summary */}
            <div style={{ padding: '20px 24px', background: result.allGood ? 'rgba(62,207,142,0.06)' : 'rgba(123,110,246,0.06)', border: `1px solid ${result.allGood ? 'rgba(62,207,142,0.2)' : 'rgba(123,110,246,0.15)'}`, borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 28 }}>{result.allGood ? '✓' : '⚡'}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.3, marginBottom: 4 }}>
                  {result.allGood ? `${result.domain} is fully configured` : `${result.domain} needs attention`}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#666' }}>
                  current email provider: <span style={{ color: '#f0f0ee' }}>{result.currentProvider}</span>
                </div>
              </div>
            </div>

            {/* Conflicts */}
            {result.conflicts && result.conflicts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>// conflicts detected</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.conflicts.map((c, i) => (
                    <div key={i} style={{ background: c.severity === 'error' ? 'rgba(255,107,107,0.06)' : 'rgba(245,166,35,0.06)', border: `1px solid ${c.severity === 'error' ? 'rgba(255,107,107,0.2)' : 'rgba(245,166,35,0.2)'}`, borderRadius: 10, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: c.severity === 'error' ? '#ff6b6b' : '#F5A623', fontWeight: 500 }}>{c.severity === 'error' ? '✗' : '⚠'} {c.type}</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: 10 }}>{c.message}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>// how to fix</div>
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>{c.fix}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A Records */}
            {result.aRecords && result.aRecords.length > 0 && (
              <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>A Records — website routing</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: result.hasErrors ? '#ff6b6b' : '#3ECF8E', background: result.hasErrors ? 'rgba(255,107,107,0.08)' : 'rgba(62,207,142,0.08)', border: `1px solid ${result.hasErrors ? 'rgba(255,107,107,0.25)' : 'rgba(62,207,142,0.25)'}`, padding: '3px 10px', borderRadius: 100 }}>{result.aRecords.length} record{result.aRecords.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  {result.aRecords.map((ip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#f0f0ee' }}>{ip}</div>
                      {ip === '76.76.21.21' && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#3ECF8E' }}>// vercel</div>}
                      {['50.63.202.45','160.153.137.167','184.168.131.241'].includes(ip) && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#ff6b6b' }}>// parked — delete this</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MX Records */}
            <Section title="MX Records — inbound email routing" status={result.mx.status}>
              {result.mx.records.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  {result.mx.records.map((r, i) => (
                    <RecordLine key={i} label={`Priority ${r.priority}`} value={r.exchange} />
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444' }}>// no MX records found</div>
              )}
              {result.mx.status !== 'ok' && FIX_INSTRUCTIONS.mx[result.mx.status] && (
                <FixBox text={FIX_INSTRUCTIONS.mx[result.mx.status]!} />
              )}
              {result.mx.status === 'ok' && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', marginTop: 4 }}>// correctly pointing to Cloudflare Email Routing</div>
              )}
            </Section>

            {/* SPF */}
            <Section title="SPF Record — outbound sending authorisation" status={result.spf.status}>
              {result.spf.record ? (
                <RecordLine label="TXT value" value={result.spf.record} />
              ) : (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444' }}>// no SPF record found</div>
              )}
              {result.spf.status !== 'ok' && FIX_INSTRUCTIONS.spf[result.spf.status] && (
                <FixBox text={FIX_INSTRUCTIONS.spf[result.spf.status]!} />
              )}
              {result.spf.status === 'ok' && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', marginTop: 4 }}>// Brevo is authorised to send on your behalf</div>
              )}
            </Section>

            {/* DKIM */}
            <Section title="DKIM Records — email signature verification" status={result.dkim.status}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'brevo1._domainkey', ok: result.dkim.brevo1 },
                  { label: 'brevo2._domainkey', ok: result.dkim.brevo2 },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.ok ? 'rgba(62,207,142,0.15)' : 'rgba(255,107,107,0.1)', border: `1px solid ${r.ok ? 'rgba(62,207,142,0.4)' : 'rgba(255,107,107,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: r.ok ? '#3ECF8E' : '#ff6b6b', flexShrink: 0 }}>
                      {r.ok ? '✓' : '✗'}
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: r.ok ? '#888' : '#444' }}>{r.label}</span>
                  </div>
                ))}
              </div>
              {result.dkim.status !== 'ok' && FIX_INSTRUCTIONS.dkim[result.dkim.status] && (
                <FixBox text={FIX_INSTRUCTIONS.dkim[result.dkim.status]!} />
              )}
              {result.dkim.status === 'ok' && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', marginTop: 12 }}>// both Brevo DKIM records present</div>
              )}
            </Section>

            {/* DMARC */}
            <Section title="DMARC Record — email policy" status={result.dmarc.status}>
              {result.dmarc.record ? (
                <RecordLine label="TXT value" value={result.dmarc.record} />
              ) : (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444' }}>// no DMARC record found</div>
              )}
              {result.dmarc.status !== 'ok' && FIX_INSTRUCTIONS.dmarc[result.dmarc.status] && (
                <FixBox text={FIX_INSTRUCTIONS.dmarc[result.dmarc.status]!} />
              )}
              {result.dmarc.status === 'ok' && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', marginTop: 4 }}>// DMARC policy active</div>
              )}
            </Section>

            {/* Next steps */}
            {!result.allGood && (
              <div style={{ marginTop: 24, padding: '24px 28px', background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>// next steps</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 16 }}>
                  Fix the issues above using our step-by-step guide. It covers Cloudflare, GoDaddy, and Namecheap.
                </div>
                <a href="/setup">
                  <button style={{ padding: '9px 20px', background: '#7B6EF6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    View setup guide →
                  </button>
                </a>
              </div>
            )}

            {result.allGood && (
              <div style={{ marginTop: 24, padding: '24px 28px', background: 'rgba(62,207,142,0.04)', border: '1px solid rgba(62,207,142,0.15)', borderRadius: 12 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>// all good</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 16 }}>
                  {result.domain} is fully configured for easonet. You can add it as an identity in the app.
                </div>
                <a href="/login">
                  <button style={{ padding: '9px 20px', background: '#7B6EF6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Open inbox →
                  </button>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>easonet</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>home</a>
            <a href="/setup" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>setup guide</a>
            <a href="/login" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>sign in</a>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#222' }}>© 2026 easonet</div>
        </div>

      </div>
    </>
  )
}
