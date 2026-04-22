import Head from 'next/head'
import { useState } from 'react'

const providers = ['Cloudflare', 'GoDaddy', 'Namecheap'] as const
type Provider = typeof providers[number]

const steps: Record<Provider, { mx: string[]; spf: string[]; nav: string[] }> = {
  Cloudflare: {
    nav: [
      'Log in at cloudflare.com and click on your domain',
      'Click DNS in the left sidebar',
      'Click Add record',
    ],
    mx: [
      'Set Type to MX',
      'Set Name to @ (or leave blank)',
      'Set Mail server to route1.mx.cloudflare.net',
      'Set Priority to 13',
      'Turn off the orange Proxy cloud — it must be grey (DNS only)',
      'Click Save',
    ],
    spf: [
      'Click Add record again',
      'Set Type to TXT',
      'Set Name to @ (or your domain name)',
      'Set Content to: v=spf1 include:_spf.brevo.com ~all',
      'Click Save',
    ],
  },
  GoDaddy: {
    nav: [
      'Log in at godaddy.com and go to My Products',
      'Find your domain and click DNS',
      'Scroll down to the records section',
    ],
    mx: [
      'Click Add under the MX records section',
      'Set Type to MX',
      'Set Host to @ (meaning your root domain)',
      'Set Points to: route1.mx.cloudflare.net',
      'Set Priority to 13',
      'Set TTL to 1 hour',
      'Click Save',
    ],
    spf: [
      'Click Add under the TXT records section',
      'Set Type to TXT',
      'Set Host to @ (meaning your root domain)',
      'Set TXT Value to: v=spf1 include:_spf.brevo.com ~all',
      'Set TTL to 1 hour',
      'Click Save',
    ],
  },
  Namecheap: {
    nav: [
      'Log in at namecheap.com and go to Domain List',
      'Click Manage next to your domain',
      'Click the Advanced DNS tab',
    ],
    mx: [
      'Click Add New Record under Mail Settings',
      'Set Type to MX Record',
      'Set Host to @',
      'Set Value to: route1.mx.cloudflare.net',
      'Set Priority to 13',
      'Set TTL to Automatic',
      'Click the green tick to save',
    ],
    spf: [
      'Click Add New Record under Host Records',
      'Set Type to TXT Record',
      'Set Host to @',
      'Set Value to: v=spf1 include:_spf.brevo.com ~all',
      'Set TTL to Automatic',
      'Click the green tick to save',
    ],
  },
}

export default function SetupPage() {
  const [provider, setProvider] = useState<Provider>('Cloudflare')
  const [expanded, setExpanded] = useState<string | null>(null)

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const s = steps[provider]

  return (
    <>
      <Head>
        <title>DNS Setup Guide — Easonet</title>
        <meta name="description" content="Step-by-step guide to setting up DNS records for your domain on Cloudflare, GoDaddy, or Namecheap to use easonet multi-brand email." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080808; --bg2: #101010; --bg3: #161616;
          --border: rgba(255,255,255,0.08); --border2: rgba(255,255,255,0.14);
          --text: #f0f0ee; --muted: #666; --accent: #7B6EF6; --green: #3ECF8E; --amber: #F5A623;
        }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-weight: 300; line-height: 1.6; }
        body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
        a { color: inherit; text-decoration: none; }
        .copy-btn { font-family: 'DM Mono', monospace; font-size: 10px; padding: 3px 10px; border: 1px solid var(--border2); border-radius: 5px; cursor: pointer; background: transparent; color: var(--muted); white-space: nowrap; transition: color .15s, border-color .15s; }
        .copy-btn:hover { color: var(--text); border-color: var(--accent); }
        .step-item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .step-item:last-child { border-bottom: none; }
        .step-num { font-family: 'DM Mono', monospace; font-size: 11px; color: #333; min-width: 24px; margin-top: 2px; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', height: 60, background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: -0.5, color: '#f0f0ee' }}>easonet</a>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/setup" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', letterSpacing: '.05em' }}>setup guide</a>
          <a href="/login" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '7px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#888' }}>sign in</a>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '100px 40px 80px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 16 }}>// dns setup guide</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: -2, lineHeight: 1, marginBottom: 20 }}>
            Two DNS records.<br />That's all it takes.
          </h1>
          <p style={{ fontSize: 17, color: '#888', maxWidth: 520, lineHeight: 1.7 }}>
            To send and receive email from your domain through easonet, you need to add two records to your DNS settings. This guide walks you through it step by step.
          </p>
        </div>

        {/* What is DNS — simple explainer */}
        <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '28px 32px', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded === 'dns' ? 20 : 0 }} onClick={() => setExpanded(expanded === 'dns' ? null : 'dns')}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>What is DNS and why do I need to change it?</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: '#555', transform: expanded === 'dns' ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</div>
          </div>
          {expanded === 'dns' && (
            <div style={{ fontSize: 14, color: '#888', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p>DNS (Domain Name System) is like a phone book for the internet. When someone types your domain name into a browser or sends you an email, DNS records tell the internet where to send that traffic.</p>
              <p>There are different types of DNS records for different purposes. The two you need to add are:</p>
              <div style={{ background: '#161616', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#7B6EF6', minWidth: 36 }}>MX</div>
                  <div style={{ fontSize: 13, color: '#888' }}><strong style={{ color: '#f0f0ee', fontWeight: 500 }}>Mail Exchange</strong> — tells the internet which server should receive emails sent to your domain. We point this at Cloudflare's routing service.</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#7B6EF6', minWidth: 36 }}>TXT</div>
                  <div style={{ fontSize: 13, color: '#888' }}><strong style={{ color: '#f0f0ee', fontWeight: 500 }}>SPF record</strong> — tells receiving mail servers that easonet is allowed to send email on behalf of your domain. Without this, outgoing emails may land in spam.</div>
                </div>
              </div>
              <p>These changes typically take 5–30 minutes to take effect, though it can occasionally take up to 48 hours. Once they're set, you never need to touch them again.</p>
            </div>
          )}
        </div>

        {/* Provider tabs */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>// select your dns provider</div>
          <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {providers.map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 12, background: provider === p ? '#7B6EF6' : 'transparent', color: provider === p ? '#fff' : '#555', transition: 'all .15s', fontWeight: provider === p ? 500 : 400 }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32 }}>

          {/* Step 1 - Navigate */}
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(123,110,246,0.15)', border: '1px solid rgba(123,110,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', flexShrink: 0 }}>1</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Open your DNS settings in {provider}</div>
            </div>
            <div style={{ padding: '20px 28px' }}>
              {s.nav.map((step, i) => (
                <div key={i} className="step-item">
                  <span className="step-num">{i + 1}.</span>
                  <span style={{ fontSize: 14, color: '#999' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 - MX record */}
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(123,110,246,0.15)', border: '1px solid rgba(123,110,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', flexShrink: 0 }}>2</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Add the MX record</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', marginTop: 2 }}>This routes incoming email to easonet</div>
              </div>
            </div>

            {/* Record preview */}
            <div style={{ padding: '20px 28px', background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>record values</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Type', value: 'MX' },
                  { label: 'Name / Host', value: '@' },
                  { label: 'Value / Points to', value: 'route1.mx.cloudflare.net' },
                  { label: 'Priority', value: '13' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', minWidth: 130 }}>{r.label}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#f0f0ee', flex: 1 }}>{r.value}</div>
                    {r.value.length > 3 && <button className="copy-btn" onClick={() => copy(r.value)}>copy</button>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px' }}>
              {s.mx.map((step, i) => (
                <div key={i} className="step-item">
                  <span className="step-num">{i + 1}.</span>
                  <span style={{ fontSize: 14, color: '#999' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 - SPF record */}
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(123,110,246,0.15)', border: '1px solid rgba(123,110,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#7B6EF6', flexShrink: 0 }}>3</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Add the SPF record</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', marginTop: 2 }}>This prevents outgoing email from landing in spam</div>
              </div>
            </div>

            {/* Record preview */}
            <div style={{ padding: '20px 28px', background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>record values</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Type', value: 'TXT' },
                  { label: 'Name / Host', value: '@' },
                  { label: 'Value / Content', value: 'v=spf1 include:_spf.brevo.com ~all' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', minWidth: 130 }}>{r.label}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#f0f0ee', flex: 1, wordBreak: 'break-all' }}>{r.value}</div>
                    {r.value.length > 3 && <button className="copy-btn" onClick={() => copy(r.value)}>copy</button>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px' }}>
              {s.spf.map((step, i) => (
                <div key={i} className="step-item">
                  <span className="step-num">{i + 1}.</span>
                  <span style={{ fontSize: 14, color: '#999' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4 - Verify */}
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3ECF8E', flexShrink: 0 }}>4</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Go back to easonet and verify</div>
            </div>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 20 }}>
              Once you've saved both records, go back to easonet and click <strong style={{ color: '#f0f0ee', fontWeight: 500 }}>"I've added the records — verify now"</strong> in the DNS setup wizard. Our checker will poll every few seconds and turn green when both records are detected.
            </p>
            <div style={{ background: '#161616', borderRadius: 8, padding: '14px 18px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', lineHeight: 1.8 }}>
              <div><span style={{ color: '#3ECF8E' }}>●</span> MX record — usually propagates in 1–5 minutes</div>
              <div><span style={{ color: '#3ECF8E' }}>●</span> SPF record — usually propagates in 1–5 minutes</div>
              <div><span style={{ color: '#F5A623' }}>○</span> In rare cases it can take up to 48 hours</div>
            </div>
          </div>

          {/* Common issues */}
          <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setExpanded(expanded === 'faq' ? null : 'faq')}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>Common issues</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: '#555', transform: expanded === 'faq' ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</div>
            </div>
            {expanded === 'faq' && (
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {[
                  { q: 'I already have an MX record — do I delete it?', a: 'If your domain was previously set up with another email provider (GoDaddy, Google Workspace, etc.), you\'ll need to delete their MX records and add ours. Make sure you\'re no longer receiving important email through that old setup first.' },
                  { q: 'I already have an SPF record — what do I do?', a: 'You can\'t have two SPF records. Instead, merge them into one. For example: v=spf1 include:_spf.google.com include:_spf.brevo.com ~all — just add include:_spf.brevo.com to your existing record.' },
                  { q: 'The checker says it can\'t find my records', a: 'Wait 5 minutes and try again. If it still fails, double-check that the Name/Host field is set to @ and not your full domain name. Some providers use @ and some use your bare domain name.' },
                  { q: 'My emails are still going to spam', a: 'Make sure both the MX and SPF records are verified. If they are, it may be that your domain is new and hasn\'t built up sending reputation yet. This improves over time as you send more legitimate emails.' },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#7B6EF6', marginBottom: 8 }}>// {q}</div>
                    <div style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>{a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, textAlign: 'center', padding: '48px 40px', background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, marginBottom: 12 }}>Ready to set up your domain?</div>
          <div style={{ fontSize: 15, color: '#888', marginBottom: 28 }}>The DNS wizard inside easonet guides you through this automatically.</div>
          <a href="/login">
            <button style={{ padding: '13px 32px', background: '#7B6EF6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Start free trial →
            </button>
          </a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>easonet</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444' }}>home</a>
            <a href="/login" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444' }}>sign in</a>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#222' }}>© 2026 easonet</div>
        </div>

      </div>
    </>
  )
}
