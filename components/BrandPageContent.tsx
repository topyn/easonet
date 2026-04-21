import { useState, useEffect } from 'react'
import Head from 'next/head'

declare global { interface Window { paypal: any; _easonetOrderId: string } }

interface Link { label: string; url: string }
interface Section { title: string; content: string }
interface Product { id: string; name: string; description?: string; price: number; currency: string; type: string; imageUrl?: string }
interface BrandPageData {
  id: string; slug: string; title: string; tagline?: string; description?: string
  logoUrl?: string; accentColor: string; bgStyle: string; fontStyle: string
  customDomain?: string; links: Link[]; sections: Section[]
  storeData?: { id: string; name: string; slug: string; products: Product[] } | null
  waitlistData?: { id: string; name: string; slug: string; headline: string; buttonText: string; _count: { signups: number } } | null
  identity?: { name: string; color: string; email: string } | null
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

const LINK_ICONS: Record<string, string> = {
  twitter: '𝕏', instagram: '◎', linkedin: '🔗', github: '⌥',
  youtube: '▶', tiktok: '♪', website: '◈', email: '✉', default: '→',
}

function getLinkIcon(label: string) {
  const l = label.toLowerCase()
  for (const [key, icon] of Object.entries(LINK_ICONS)) {
    if (l.includes(key)) return icon
  }
  return LINK_ICONS.default
}

export default function BrandPageContent({ page }: { page: BrandPageData }) {
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistJoined, setWaitlistJoined] = useState(false)
  const [cartProduct, setCartProduct] = useState<Product | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [checkoutStep, setCheckoutStep] = useState<'browse' | 'details' | 'pay' | 'success'>('browse')
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  useEffect(() => {
    if (checkoutStep !== 'pay' || paypalLoaded || !page) return
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`
    script.onload = () => { setPaypalLoaded(true); setTimeout(() => renderPayPal(), 500) }
    document.body.appendChild(script)
  }, [checkoutStep])

  useEffect(() => { if (paypalLoaded && checkoutStep === 'pay') renderPayPal() }, [paypalLoaded])

  function renderPayPal() {
    if (!window.paypal || !cartProduct || !page?.storeData) return
    const container = document.getElementById('pp-btn')
    if (!container || container.children.length > 0) return
    window.paypal.Buttons({
      createOrder: async () => {
        const res = await fetch('https://www.easonet.com/api/orders/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: cartProduct.id, quantity: 1, buyerName, buyerEmail }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        window._easonetOrderId = data.orderId
        return data.paypalOrderId
      },
      onApprove: async (data: any) => {
        const res = await fetch('https://www.easonet.com/api/orders/capture', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: window._easonetOrderId, paypalOrderId: data.orderID }),
        })
        const json = await res.json()
        if (!res.ok) { alert(json.error || 'Payment failed'); return }
        setCheckoutStep('success')
      },
      onError: () => alert('Payment failed — please try again'),
    }).render('#pp-btn')
  }

  async function sendContact() {
    if (!contactName || !contactEmail || !contactMsg) return
    setContactLoading(true)
    await fetch('https://www.easonet.com/api/contact/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMsg }),
    })
    setContactLoading(false)
    setContactSent(true)
  }

  async function joinWaitlist() {
    if (!waitlistEmail || !page?.waitlistData) return
    await fetch('https://www.easonet.com/api/waitlists/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: page.waitlistData.slug, email: waitlistEmail }),
    })
    setWaitlistJoined(true)
  }

  const isDark = page.bgStyle === 'dark'
  const bg = isDark ? '#080808' : '#fafaf8'
  const bg2 = isDark ? '#101010' : '#ffffff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#f0f0ee' : '#1a1a1a'
  const textMuted = isDark ? '#666' : '#888'
  const accent = page.accentColor
  const isModern = page.fontStyle === 'modern'
  const headingFont = isModern ? "'Syne', sans-serif" : "Georgia, serif"
  const bodyFont = isModern ? "'DM Sans', sans-serif" : "Georgia, serif"

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: isDark ? '#0d0d0d' : '#f5f5f3',
    border: `1px solid ${border}`, borderRadius: 10,
    fontSize: 14, color: textPrimary,
    fontFamily: bodyFont, outline: 'none', boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    padding: '12px 28px', background: accent, color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: bodyFont,
  }

  return (
    <>
      <Head>
        <title>{page.title}{page.tagline ? ` — ${page.tagline}` : ''}</title>
        <meta name="description" content={page.description || page.tagline || page.title} />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${bg}; color: ${textPrimary}; }
        ${isDark ? `body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; }` : ''}
        input:focus, textarea:focus { border-color: ${accent}88 !important; outline: none; }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          {page.logoUrl && <img src={page.logoUrl} alt={page.title} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 20, border: `2px solid ${accent}44` }} />}
          <h1 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 'clamp(36px, 6vw, 56px)', letterSpacing: isModern ? -2 : -0.5, lineHeight: 1, marginBottom: 14, color: textPrimary }}>{page.title}</h1>
          {page.tagline && <p style={{ fontSize: 18, color: textMuted, fontFamily: bodyFont, fontWeight: 300, lineHeight: 1.6 }}>{page.tagline}</p>}
          {page.description && <p style={{ fontSize: 15, color: textMuted, fontFamily: bodyFont, lineHeight: 1.8, marginTop: 16, maxWidth: 500, margin: '16px auto 0' }}>{page.description}</p>}
        </div>

        {/* Links */}
        {page.links && (page.links as Link[]).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 60 }}>
            {(page.links as Link[]).map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: bg2, border: `1px solid ${border}`, borderRadius: 12, transition: 'border-color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '66')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{getLinkIcon(link.label)}</span>
                <span style={{ fontFamily: bodyFont, fontSize: 15, fontWeight: 500, color: textPrimary }}>{link.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 11, color: textMuted }}>→</span>
              </a>
            ))}
          </div>
        )}

        {/* Custom sections */}
        {page.sections && (page.sections as Section[]).length > 0 && (page.sections as Section[]).map((section, i) => (
          <div key={i} style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, letterSpacing: isModern ? -0.5 : 0, marginBottom: 12, color: textPrimary }}>{section.title}</h2>
            <div style={{ fontSize: 15, color: textMuted, lineHeight: 1.8, fontFamily: bodyFont, whiteSpace: 'pre-wrap' }}>{section.content}</div>
          </div>
        ))}

        {/* Store */}
        {page.storeData && page.storeData.products.length > 0 && checkoutStep === 'browse' && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, letterSpacing: isModern ? -0.5 : 0, marginBottom: 20, color: textPrimary }}>{page.storeData.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {page.storeData.products.map(p => (
                <div key={p.id} style={{ background: bg2, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '66')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                >
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: accent, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{p.type}</div>
                    <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 16, marginBottom: 8, color: textPrimary }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 20, color: accent }}>${p.price.toFixed(2)}</div>
                      <button onClick={() => { setCartProduct(p); setCheckoutStep('details') }}
                        style={{ padding: '7px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: bodyFont }}>
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout - details */}
        {cartProduct && checkoutStep === 'details' && (
          <div style={{ marginBottom: 60 }}>
            <button onClick={() => setCheckoutStep('browse')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accent, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 20 }}>← back</button>
            <div style={{ background: bg2, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 17, color: textPrimary, marginBottom: 4 }}>{cartProduct.name}</div>
              <div style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 24, color: accent }}>${cartProduct.price.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{label: 'Your name', value: buyerName, set: setBuyerName, type: 'text', placeholder: 'Full name'}, {label: 'Email', value: buyerEmail, set: setBuyerEmail, type: 'email', placeholder: 'your@email.com'}].map(f => (
                <div key={f.label}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <button onClick={() => { if (buyerName && buyerEmail) setCheckoutStep('pay') }} disabled={!buyerName || !buyerEmail}
                style={{ ...btnStyle, opacity: !buyerName || !buyerEmail ? 0.5 : 1 }}>Continue to payment →</button>
            </div>
          </div>
        )}

        {/* Checkout - pay */}
        {cartProduct && checkoutStep === 'pay' && (
          <div style={{ marginBottom: 60 }}>
            <button onClick={() => setCheckoutStep('details')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accent, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 20 }}>← back</button>
            <div style={{ background: bg2, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: textMuted, marginBottom: 4, fontFamily: bodyFont }}>Paying for</div>
              <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 17, color: textPrimary }}>{cartProduct.name}</div>
              <div style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 24, color: accent }}>${cartProduct.price.toFixed(2)}</div>
            </div>
            <div id="pp-btn"></div>
            {!paypalLoaded && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: textMuted, textAlign: 'center', padding: 20 }}>// loading PayPal…</div>}
          </div>
        )}

        {/* Checkout - success */}
        {checkoutStep === 'success' && (
          <div style={{ marginBottom: 60, textAlign: 'center', padding: '40px 32px', background: `${accent}0a`, border: `1px solid ${accent}33`, borderRadius: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: headingFont, fontWeight: 800, fontSize: 22, color: accent, marginBottom: 8 }}>Payment successful</div>
            <div style={{ fontSize: 14, color: textMuted, fontFamily: bodyFont }}>A confirmation has been sent to {buyerEmail}</div>
          </div>
        )}

        {/* Waitlist */}
        {page.waitlistData && (
          <div style={{ marginBottom: 60, background: bg2, border: `1px solid ${border}`, borderRadius: 14, padding: '32px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, letterSpacing: isModern ? -0.5 : 0, marginBottom: 10, color: textPrimary }}>{page.waitlistData.headline}</h2>
            {page.waitlistData._count.signups > 0 && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: textMuted, marginBottom: 20 }}>{page.waitlistData._count.signups} people waiting</div>
            )}
            {!waitlistJoined ? (
              <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                <input type="email" value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={joinWaitlist} disabled={!waitlistEmail} style={{ ...btnStyle, padding: '12px 20px', whiteSpace: 'nowrap' as const }}>{page.waitlistData.buttonText}</button>
              </div>
            ) : (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: accent }}>✓ You're on the list</div>
            )}
          </div>
        )}

        {/* Contact */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, letterSpacing: isModern ? -0.5 : 0, marginBottom: 20, color: textPrimary }}>Get in touch</h2>
          {!contactSent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{label: 'Name', value: contactName, set: setContactName, type: 'text', placeholder: 'Your name'}, {label: 'Email', value: contactEmail, set: setContactEmail, type: 'email', placeholder: 'your@email.com'}].map(f => (
                <div key={f.label}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: textMuted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Message</label>
                <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder="What would you like to discuss?" style={{ ...inputStyle, resize: 'none', height: 120 }} />
              </div>
              <button onClick={sendContact} disabled={contactLoading || !contactName || !contactEmail || !contactMsg}
                style={{ ...btnStyle, opacity: contactLoading || !contactName || !contactEmail || !contactMsg ? 0.5 : 1 }}>
                {contactLoading ? 'Sending…' : 'Send message →'}
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px 24px', background: `${accent}0a`, border: `1px solid ${accent}33`, borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 13, color: accent }}>
              ✓ Message sent — we'll be in touch soon
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 32, borderTop: `1px solid ${border}` }}>
          <a href="https://easonet.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isDark ? '#222' : '#ccc' }}>powered by easonet</a>
        </div>
      </div>
    </>
  )
}
