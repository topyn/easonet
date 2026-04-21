import { useState, useEffect } from 'react'
import Head from 'next/head'

declare global { interface Window { paypal: any; _easonetOrderId: string } }

export default function Template1({ page }: { page: any }) {
  const ac = page.accentColor || '#7B6EF6'
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const features = (page.features || []).slice(0, 3)
  const stats = (page.stats || []).slice(0, 4)
  const links = (page.links || []).slice(0, 6)

  async function sendContact() {
    if (!contactName || !contactEmail || !contactMsg) return
    setLoading(true)
    await fetch('https://www.easonet.com/api/contact/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMsg }),
    })
    setLoading(false); setContactSent(true)
  }

  return (
    <>
      <Head>
        <title>{page.title}{page.tagline ? ` — ${page.tagline}` : ''}</title>
        <meta name="description" content={page.description || page.tagline || page.title} />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#080808;color:#f0f0ee;font-family:'DM Sans',sans-serif;font-weight:300;overflow-x:hidden}
        body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:52px 52px;pointer-events:none;z-index:0}
        a{color:inherit;text-decoration:none}
        input,textarea{width:100%;padding:12px 16px;background:#101010;border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:14px;color:#f0f0ee;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s}
        input:focus,textarea:focus{border-color:${ac}88}
        textarea{resize:none;height:100px}
        @keyframes t1pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* NAV */}
      <nav style={{ position:'sticky',top:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',height:58,background:'rgba(8,8,8,.9)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,letterSpacing:-.5 }}>
          {page.logoUrl && <img src={page.logoUrl} style={{ width:28,height:28,borderRadius:6,objectFit:'cover' }} alt="" />}
          {page.title}
        </div>
        <div style={{ display:'flex',gap:28 }}>
          {['Features','About','Contact'].map(l => (
            <a key={l} href={`#t1-${l.toLowerCase()}`} style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#555',letterSpacing:'.04em' }}>{l}</a>
          ))}
        </div>
        <button onClick={() => document.getElementById('t1-contact')?.scrollIntoView({behavior:'smooth'})}
          style={{ fontFamily:"'DM Mono',monospace",fontSize:11,padding:'8px 18px',border:'1px solid rgba(255,255,255,.07)',borderRadius:6,color:'#666',background:'transparent',cursor:'pointer' }}>
          {page.ctaText || 'Get in touch'}
        </button>
      </nav>

      {/* HERO */}
      <section style={{ position:'relative',zIndex:1,minHeight:'calc(100vh - 58px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'80px 48px 60px' }}>
        {page.badgeText && (
          <div style={{ display:'inline-flex',alignItems:'center',gap:8,fontFamily:"'DM Mono',monospace",fontSize:11,color:ac,letterSpacing:'.1em',textTransform:'uppercase',padding:'5px 14px',border:`1px solid ${ac}44`,borderRadius:100,background:`${ac}0d`,marginBottom:32 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:ac,animation:'t1pulse 2s infinite',display:'inline-block' }}/>
            {page.badgeText}
          </div>
        )}
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'clamp(52px,8vw,100px)',letterSpacing:-3,lineHeight:.92,marginBottom:20 }}>
          {page.headlineLine1 || page.title}<br/>
          <em style={{ fontStyle:'normal',color:ac }}>{page.headlineLine2 || page.tagline}</em>
        </h1>
        <p style={{ fontSize:17,color:'#666',maxWidth:500,marginBottom:36,lineHeight:1.75 }}>{page.description}</p>
        {page.heroImage && (
          <div style={{ marginBottom:44 }}>
            <img src={page.heroImage} alt={page.title} style={{ maxWidth:480,width:'100%',borderRadius:12,border:'1px solid rgba(255,255,255,.08)' }} />
          </div>
        )}
        <div style={{ display:'flex',gap:12,justifyContent:'center' }}>
          <button style={{ padding:'13px 30px',background:ac,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
            {page.ctaText || 'Get started'} →
          </button>
          <button onClick={() => document.getElementById('t1-features')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'13px 24px',border:'1px solid rgba(255,255,255,.07)',background:'transparent',color:'#666',borderRadius:8,fontSize:14,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
            Learn more
          </button>
        </div>
      </section>

      {/* FEATURES */}
      {features.length > 0 && (
        <section id="t1-features" style={{ position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.07)',display:'grid',gridTemplateColumns:`repeat(${features.length},1fr)`,gap:1,background:'rgba(255,255,255,.07)' }}>
          {features.map((f: any, i: number) => (
            <div key={i} style={{ background:'#080808',padding:'40px 36px' }}>
              {f.label && <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ac,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:14 }}>// {f.label}</div>}
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,letterSpacing:-.5,marginBottom:10 }}>{f.title}</div>
              <p style={{ fontSize:14,color:'#666',lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </section>
      )}

      {/* STATS */}
      {stats.length > 0 && (
        <section style={{ position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.07)',display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:1,background:'rgba(255,255,255,.07)' }}>
          {stats.map((s: any, i: number) => (
            <div key={i} style={{ background:'#101010',padding:'40px 28px',textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:52,letterSpacing:-2,color:ac,lineHeight:1,marginBottom:8 }}>{s.num}</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#444',textTransform:'uppercase',letterSpacing:'.1em' }}>{s.label}</div>
            </div>
          ))}
        </section>
      )}

      {/* ABOUT */}
      {(page.description || links.length > 0) && (
        <section id="t1-about" style={{ position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.07)',display:'grid',gridTemplateColumns:'1fr 1fr',maxWidth:1200,margin:'0 auto',padding:'80px 48px',gap:80,alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:ac,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:20 }}>// about</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'clamp(28px,3.5vw,44px)',letterSpacing:-1.5,marginBottom:16,lineHeight:1.05 }}>{page.aboutHeadline || page.title}</h2>
            <p style={{ fontSize:15,color:'#666',lineHeight:1.8,marginBottom:28 }}>{page.description}</p>
            <button onClick={() => document.getElementById('t1-contact')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'13px 28px',background:ac,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
              {page.ctaText || 'Get in touch'} →
            </button>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {links.map((link: any, i: number) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer"
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,fontSize:14,color:'#777',transition:'all .2s',cursor:'pointer' }}>
                {link.label}
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:ac }}>→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="t1-contact" style={{ position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.07)',maxWidth:600,margin:'0 auto',padding:'80px 48px',textAlign:'center' }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:ac,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:16 }}>// get in touch</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'clamp(28px,3.5vw,38px)',letterSpacing:-1.5,marginBottom:10 }}>{page.contactHeadline || "Let's talk"}</h2>
        <p style={{ fontSize:15,color:'#666',marginBottom:32,lineHeight:1.7 }}>{page.contactSub || 'Send us a message and we will get back to you.'}</p>
        {!contactSent ? (
          <div style={{ display:'flex',flexDirection:'column',gap:12,textAlign:'left' }}>
            <input type="text" placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)} />
            <input type="email" placeholder="your@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            <textarea placeholder="Your message..." value={contactMsg} onChange={e => setContactMsg(e.target.value)} />
            <button onClick={sendContact} disabled={loading || !contactName || !contactEmail || !contactMsg}
              style={{ padding:'13px',background:(!contactName||!contactEmail||!contactMsg)?'#1a1a1a':ac,color:(!contactName||!contactEmail||!contactMsg)?'#333':'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
              {loading ? 'Sending…' : 'Send message →'}
            </button>
          </div>
        ) : (
          <div style={{ padding:'20px',background:`${ac}0d`,border:`1px solid ${ac}33`,borderRadius:10,fontFamily:"'DM Mono',monospace",fontSize:13,color:ac }}>
            ✓ Message sent — we'll be in touch soon
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.07)',padding:'28px 48px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15 }}>{page.title}</div>
        <div style={{ display:'flex',gap:20 }}>
          {links.slice(0,4).map((l: any, i: number) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333' }}>{l.label}</a>
          ))}
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#222' }}>powered by easonet</div>
      </footer>
    </>
  )
}
