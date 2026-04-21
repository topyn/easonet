import { useState } from 'react'
import Head from 'next/head'

export default function Template3({ page }: { page: any }) {
  const ac = page.accentColor || '#F5A623'
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const features = (page.features || []).slice(0, 3)
  const stats = (page.stats || []).slice(0, 4)
  const links = (page.links || []).slice(0, 6)
  const heroStats = (page.stats || []).slice(0, 3)

  async function sendContact() {
    if (!contactName || !contactEmail || !contactMsg) return
    setLoading(true)
    await fetch('https://www.easonet.com/api/contact/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMsg }),
    })
    setLoading(false); setContactSent(true)
  }

  const inp: React.CSSProperties = { padding:'13px 16px',background:'rgba(255,255,255,.85)',border:'1px solid rgba(0,0,0,.1)',borderRadius:6,fontSize:14,color:'#111008',outline:'none',fontFamily:"'DM Sans',sans-serif",transition:'all .2s',width:'100%',boxSizing:'border-box' as const }

  return (
    <>
      <Head>
        <title>{page.title}{page.tagline ? ` — ${page.tagline}` : ''}</title>
        <meta name="description" content={page.description || page.tagline || page.title} />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:#f5f4f0;color:#111008;font-family:'DM Sans',sans-serif;overflow-x:hidden}a{color:inherit;text-decoration:none}input:focus,textarea:focus{background:#fff !important;border-color:#111008 !important;outline:none}`}</style>

      {/* NAV */}
      <nav style={{ position:'sticky',top:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',height:60,background:'rgba(245,244,240,.94)',backdropFilter:'blur(20px)',borderBottom:'1px solid #dddbd3' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,letterSpacing:-.5 }}>
          {page.logoUrl && <img src={page.logoUrl} style={{ width:28,height:28,borderRadius:6,objectFit:'cover' }} alt="" />}
          {page.title}
        </div>
        <div style={{ display:'flex',gap:28 }}>
          {['Features','About','Contact'].map((l,i) => (
            <a key={i} href={`#t3-${l.toLowerCase()}`} style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:'#7a7870',fontWeight:500 }}>{l}</a>
          ))}
        </div>
        <button onClick={() => document.getElementById('t3-contact')?.scrollIntoView({behavior:'smooth'})}
          style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,padding:'9px 22px',background:ac,color:'#111008',border:'none',borderRadius:6,cursor:'pointer' }}>
          {page.ctaText || 'Order now'} →
        </button>
      </nav>

      {/* HERO */}
      <section style={{ background:ac,padding:'100px 60px 72px' }}>
        <div style={{ maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr auto',gap:60,alignItems:'end' }}>
          <div>
            {page.badgeText && <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(17,16,8,.5)',marginBottom:20,display:'block' }}>{page.badgeText}</span>}
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(52px,8vw,104px)',letterSpacing:-3,lineHeight:.9,color:'#111008',marginBottom:24 }}>
              {page.headlineLine1 || page.title}<br/>{page.headlineLine2 || page.tagline}
            </h1>
            <p style={{ fontSize:16,color:'rgba(17,16,8,.6)',maxWidth:460,lineHeight:1.65,marginBottom:32,fontWeight:400 }}>{page.description}</p>
            <div style={{ display:'flex',gap:12 }}>
              <button onClick={() => document.getElementById('t3-contact')?.scrollIntoView({behavior:'smooth'})}
                style={{ padding:'14px 30px',background:'#111008',color:ac,border:'none',borderRadius:6,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>
                {page.ctaText || 'Order now'} →
              </button>
              <button onClick={() => document.getElementById('t3-features')?.scrollIntoView({behavior:'smooth'})}
                style={{ padding:'14px 24px',background:'transparent',color:'#111008',border:'2px solid #111008',borderRadius:6,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>
                Learn more
              </button>
            </div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
            {heroStats.map((s: any, i: number) => (
              <div key={i} style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:48,letterSpacing:-2,color:'#111008',lineHeight:1 }}>{s.num}</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'rgba(17,16,8,.4)',marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HERO IMAGE */}
      {page.heroImage && (
        <div style={{ maxWidth:1200,margin:'0 auto',padding:'48px 60px 0' }}>
          <img src={page.heroImage} alt={page.title} style={{ width:'100%',borderRadius:12,border:'1px solid #dddbd3',maxHeight:480,objectFit:'cover' }} />
        </div>
      )}

      {/* FEATURES */}
      {features.length > 0 && (
        <section id="t3-features" style={{ maxWidth:1200,margin:'0 auto',padding:'80px 60px' }}>
          <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(32px,4vw,52px)',letterSpacing:-2,lineHeight:1 }}>{page.featuresHeadline || 'What makes us different.'}</h2>
            <p style={{ fontSize:14,color:'#7a7870',maxWidth:240,textAlign:'right',lineHeight:1.65 }}>{page.tagline}</p>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:`repeat(${features.length},1fr)`,gap:16 }}>
            {features.map((f: any, i: number) => (
              <div key={i} style={{ background:'#fff',border:'1px solid #dddbd3',borderRadius:10,padding:32,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:ac }}/>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#7a7870',marginBottom:18 }}>
                  0{i+1}{f.label ? ` — ${f.label}` : ''}
                </div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,letterSpacing:-.5,marginBottom:10 }}>{f.title}</div>
                <p style={{ fontSize:14,color:'#7a7870',lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STATS */}
      {stats.length > 0 && (
        <div style={{ background:'#111008',display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)` }}>
          {stats.map((s: any, i: number) => (
            <div key={i} style={{ padding:'44px 40px',borderRight:`1px solid rgba(255,255,255,.08)`,textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:52,letterSpacing:-2,color:ac,lineHeight:1,marginBottom:6 }}>{s.num}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'rgba(255,255,255,.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ABOUT */}
      <section id="t3-about" style={{ maxWidth:1200,margin:'0 auto',padding:'80px 60px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center' }}>
        <div>
          <div style={{ display:'inline-block',fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',padding:'5px 12px',background:ac,color:'#111008',borderRadius:4,marginBottom:18 }}>About us</div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(28px,3vw,44px)',letterSpacing:-1.5,marginBottom:16,lineHeight:1.05 }}>{page.aboutHeadline || page.title}</h2>
          <p style={{ fontSize:15,color:'#7a7870',lineHeight:1.8,marginBottom:28 }}>{page.description}</p>
          <button onClick={() => document.getElementById('t3-contact')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'14px 28px',background:'#111008',color:ac,border:'none',borderRadius:6,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif" }}>
            {page.ctaText || 'Get in touch'} →
          </button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {links.map((link: any, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:'#fff',border:'1px solid #dddbd3',borderRadius:8,fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:600,color:'#111008',transition:'all .2s',cursor:'pointer' }}>
              {link.label}
              <span style={{ fontSize:16,color:ac }}>→</span>
            </a>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="t3-contact" style={{ background:ac,padding:'80px 60px' }}>
        <div style={{ maxWidth:700,margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(32px,4vw,52px)',letterSpacing:-2,color:'#111008',marginBottom:8,lineHeight:1 }}>{page.contactHeadline || "Let's talk."}</h2>
          <p style={{ fontSize:15,color:'rgba(17,16,8,.6)',marginBottom:32,lineHeight:1.65 }}>{page.contactSub || 'Reach out and we will get back to you fast.'}</p>
          {!contactSent ? (
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <input style={inp} type="text" placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)} />
                <input style={inp} type="email" placeholder="your@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
              <textarea style={{ ...inp,resize:'none',height:100 }} placeholder="What's on your mind?" value={contactMsg} onChange={e => setContactMsg(e.target.value)} />
              <button onClick={sendContact} disabled={loading || !contactName || !contactEmail || !contactMsg}
                style={{ padding:15,background:'#111008',color:ac,border:'none',borderRadius:6,fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:"'Space Grotesk',sans-serif",opacity:(!contactName||!contactEmail||!contactMsg)?0.5:1 }}>
                {loading ? 'Sending…' : 'Send message →'}
              </button>
            </div>
          ) : (
            <div style={{ padding:'20px',background:'rgba(17,16,8,.08)',border:'1px solid rgba(17,16,8,.15)',borderRadius:8,fontSize:14,color:'#111008',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600 }}>
              ✓ Message sent — we'll get back to you fast.
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#111008',padding:'32px 60px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:ac,letterSpacing:-.3 }}>{page.title}</div>
        <div style={{ display:'flex',gap:24 }}>
          {links.slice(0,4).map((l: any, i: number) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:500,color:'rgba(255,255,255,.4)' }}>{l.label}</a>
          ))}
        </div>
        <div style={{ fontSize:11,color:'rgba(255,255,255,.25)',fontFamily:"'Space Grotesk',sans-serif" }}>powered by easonet</div>
      </footer>
    </>
  )
}
