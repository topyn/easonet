import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

declare global { interface Window { paypal: any } }

interface Product { id: string; name: string; description?: string; price: number; currency: string; type: string; imageUrl?: string; stock?: number }
interface StoreInfo { id: string; name: string; slug: string; description?: string; products: Product[]; identity?: { name: string; color: string } | null }

export default function StorePage() {
  const router = useRouter()
  const { slug } = router.query
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [cart, setCart] = useState<{ product: Product; qty: number } | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [step, setStep] = useState<'browse' | 'details' | 'pay' | 'success'>('browse')
  const [orderResult, setOrderResult] = useState<any>(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  useEffect(() => {
    if (!slug) return
    fetch(`/api/stores/info?slug=${slug}`).then(r => r.json()).then(data => setStore(data))
  }, [slug])

  useEffect(() => {
    if (step !== 'pay' || paypalLoaded) return
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`
    script.onload = () => {
      setPaypalLoaded(true)
      setTimeout(() => renderPayPal(), 500)
    }
    document.body.appendChild(script)
  }, [step])

  useEffect(() => {
    if (paypalLoaded && step === 'pay') renderPayPal()
  }, [paypalLoaded])

  function renderPayPal() {
    if (!window.paypal || !cart) return
    const container = document.getElementById('paypal-button-container')
    if (!container || container.children.length > 0) return

    window.paypal.Buttons({
      createOrder: async () => {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: cart.product.id, quantity: cart.qty, buyerName, buyerEmail, buyerAddress }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        window._easonetOrderId = data.orderId
        return data.paypalOrderId
      },
      onApprove: async (data: any) => {
        const res = await fetch('/api/orders/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: window._easonetOrderId, paypalOrderId: data.orderID }),
        })
        const json = await res.json()
        if (!res.ok) { alert(json.error || 'Payment capture failed'); return }
        setOrderResult(json.product)
        setStep('success')
      },
      onError: (err: any) => { alert('Payment failed — please try again') },
    }).render('#paypal-button-container')
  }

  if (!store) return <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>// loading…</div>

  const accentColor = store.identity?.color ?? '#7B6EF6'

  return (
    <>
      <Head>
        <title>{store.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #080808; color: #f0f0ee; font-family: 'DM Sans', sans-serif; } body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; } input:focus { outline: none; border-color: ${accentColor}88 !important; }`}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 32px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accentColor, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>{store.identity?.name ?? store.name}</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: -1.5, marginBottom: 10 }}>{store.name}</h1>
          {store.description && <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7 }}>{store.description}</p>}
        </div>

        {/* Browse */}
        {step === 'browse' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {store.products.map(p => (
              <div key={p.id} style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor + '44')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
                <div style={{ padding: '20px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: p.type === 'digital' ? accentColor : '#F5A623', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{p.type}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.3, marginBottom: 6 }}>{p.name}</div>
                  {p.description && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>{p.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -1 }}>${p.price.toFixed(2)}</div>
                    <button onClick={() => { setCart({ product: p, qty: 1 }); setStep('details') }}
                      style={{ padding: '8px 18px', background: accentColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      Buy now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details */}
        {step === 'details' && cart && (
          <div style={{ maxWidth: 480 }}>
            <button onClick={() => setStep('browse')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accentColor, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 24 }}>← back</button>
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{cart.product.name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: -1, color: accentColor }}>${(cart.product.price * cart.qty).toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Your name', value: buyerName, set: setBuyerName, placeholder: 'Full name', type: 'text' },
                { label: 'Email address', value: buyerEmail, set: setBuyerEmail, placeholder: 'your@email.com', type: 'email' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 14px', background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif", transition: 'border-color .2s' }} />
                </div>
              ))}
              {cart.product.type === 'physical' && (
                <div>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Shipping address</label>
                  <textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="Street, City, State, ZIP, Country"
                    style={{ width: '100%', padding: '11px 14px', background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: '#f0f0ee', fontFamily: "'DM Sans', sans-serif', resize: 'none", height: 80 }} />
                </div>
              )}
              <button onClick={() => { if (!buyerName || !buyerEmail) return; setStep('pay') }}
                disabled={!buyerName || !buyerEmail}
                style={{ padding: '13px', background: !buyerName || !buyerEmail ? '#1a1a1a' : accentColor, color: !buyerName || !buyerEmail ? '#444' : '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: !buyerName || !buyerEmail ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Continue to payment →
              </button>
            </div>
          </div>
        )}

        {/* Pay */}
        {step === 'pay' && cart && (
          <div style={{ maxWidth: 480 }}>
            <button onClick={() => setStep('details')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: accentColor, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 24 }}>← back</button>
            <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Paying for</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{cart.product.name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: -1, color: accentColor }}>${(cart.product.price * cart.qty).toFixed(2)}</div>
            </div>
            <div id="paypal-button-container"></div>
            {!paypalLoaded && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center', padding: 20 }}>// loading PayPal…</div>}
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 14, padding: '48px 32px' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: -0.5, color: '#3ECF8E', marginBottom: 10 }}>Payment successful</div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>A confirmation has been sent to {buyerEmail}</div>
              {orderResult?.fileUrl && (
                <a href={orderResult.fileUrl} target="_blank" rel="noreferrer">
                  <button style={{ padding: '12px 28px', background: accentColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Download your file →
                  </button>
                </a>
              )}
              {orderResult?.deliveryNote && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', marginTop: 16 }}>{orderResult.deliveryNote}</div>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, textAlign: 'center' }}>
          <a href="https://easonet.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#222' }}>powered by easonet</a>
        </div>
      </div>
    </>
  )
}
