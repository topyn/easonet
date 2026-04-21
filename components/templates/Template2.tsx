import { useState } from 'react'
import Head from 'next/head'

export default function Template2({ page }: { page: any }) {
  const ac = page.accentColor || '#C8953A'
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

  const inp: React.CSSProperties = { width:'100%',padding:'13px 16px',background:'#faf9f6',border:'1px solid #e8e4dc',borderRadius:3,fontSize:14,color:'#1a1916',outline:'none',fontFamily:"'DM Sans',sans-serif",transition:'border-color .2s',boxSizing:'border-box' as const }

  return (
    <>
      <Head>
        <title>{page.title}{page.tagline ? ` — ${page.tagline}` : ''}</title>
        <meta name="description" content={page.description || page.tagline || page.title} />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:#faf9f6;color:#1a1916;font-family:'DM Sans',sans-serif;font-weight:300;overflow-x:hidden}a{color:inherit;text-decoration:none}input:focus,textarea:focus{border-color:${ac} !important;outline:none}`}</style>

      {/* NAV */}
      <nav style={{ position:'sticky',top:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 56px',height:60,background:'rgba(250,249,246,.94)',backdropFilter:'blur(20px)',borderBottom:'1px solid #e8e4dc' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:20,letterSpacing:-.3 }}>
          {page.logoUrl && <img src={page.logoUrl} style={{ width:28,height:28,borderRadius:6,objectFit:'cover' }} alt="" />}
          {page.title}
        </div>
        <div style={{ display:'flex',gap:32 }}>
          {['What we do','About','Contact'].map((l,i) => (
            <a key={i} href={`#t2-${['features','about','contact'][i]}`} style={{ fontSize:13,color:'#7a7060',transition:'color .2s' }}>{l}</a>
          ))}
        </div>
        <button onClick={() => document.getElementById('t2-contact')?.scrollIntoView({behavior:'smooth'})}
          style={{ fontSize:13,padding:'9px 22px',background:'#1a1916',color:'#faf9f6',border:'none',borderRadius:3,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}>
          {page.ctaText || 'Get in touch'}
        </button>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth:1280,margin:'0 auto',padding:'100px 56px 80px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:72,alignItems:'center',minHeight:'calc(100vh - 60px)' }}>
        <div>
          {page.badgeText && <div style={{ fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'#b0a898',marginBottom:22,fontWeight:500 }}>{page.badgeText}</div>}
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontWeight:900,fontSize:'clamp(44px,5.5vw,76px)',letterSpacing:-.5,lineHeight:1.02,marginBottom:18 }}>
            {page.headlineLine1 || page.title}<br/>
            <em style={{ color:ac }}>{page.headlineLine2 || page.tagline}</em>
          </h1>
          <p style={{ fontSize:16,color:'#7a7060',lineHeight:1.8,marginBottom:36,maxWidth:420 }}>{page.description}</p>
          <div style={{ display:'flex',gap:14 }}>
            <button onClick={() => document.getElementById('t2-contact')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'14px 32px',background:'#1a1916',color:'#faf9f6',border:'none',borderRadius:3,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
              {page.ctaText || 'Get started'}
            </button>
            <button onClick={() => document.getElementById('t2-features')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'14px 24px',border:'1px solid #e8e4dc',background:'transparent',color:'#7a7060',borderRadius:3,fontSize:14,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
              Learn more
            </button>
          </div>
        </div>
        <div style={{ background:'#f0ece4',border:'1px solid #e8e4dc',borderRadius:4,aspectRatio:'4/3',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
          {page.heroImage
            ? <img src={page.heroImage} alt={page.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : <div style={{ fontSize:13,color:'#b0a898',letterSpacing:'.06em',textTransform:'uppercase' }}>{page.title}</div>
          }
        </div>
      </section>

      <hr style={{ border:'none',borderTop:'1px solid #e8e4dc' }} />

      {/* FEATURES */}
      {features.length > 0 && (
        <section id="t2-features" style={{ maxWidth:1280,margin:'0 auto',padding:'80px 56px' }}>
          <div style={{ marginBottom:48 }}>
            <div style={{ fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'#b0a898',marginBottom:14 }}>What we offer</div>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:'clamp(32px,3.5vw,48px)',letterSpacing:-.3 }}>{page.featuresHeadline || 'What sets us apart.'}</h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:`repeat(${features.length},1fr)`,gap:24 }}>
            {features.map((f: any, i: number) => (
              <div key={i} style={{ background:'#fff',border:'1px solid #e8e4dc',borderRadius:4,padding:32 }}>
                <div style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:40,fontWeight:900,color:ac,marginBottom:16,lineHeight:1 }}>0{i+1}</div>
                <div style={{ fontSize:17,fontWeight:500,marginBottom:10,letterSpacing:-.2 }}>{f.title}</div>
                <p style={{ fontSize:14,color:'#7a7060',lineHeight:1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STATS */}
      {stats.length > 0 && (
        <div style={{ background:'#1a1916',padding:'56px',display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,textAlign:'center' }}>
          {stats.map((s: any, i: number) => (
            <div key={i} style={{ padding:20 }}>
              <div style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:52,fontWeight:900,color:'#faf9f6',letterSpacing:-2,lineHeight:1,marginBottom:8 }}>{s.num}</div>
              <div style={{ fontSize:11,letterSpacing:'.15em',textTransform:'uppercase',color:'rgba(250,249,246,.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ABOUT */}
      <section id="t2-about" style={{ maxWidth:1280,margin:'0 auto',padding:'80px 56px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'start' }}>
        <div>
          <div style={{ fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'#b0a898',marginBottom:18 }}>Our story</div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:'clamp(28px,3vw,42px)',letterSpacing:-.3,marginBottom:18,lineHeight:1.1 }}>{page.aboutHeadline || page.title}</h2>
          <p style={{ fontSize:15,color:'#7a7060',lineHeight:1.85,marginBottom:28 }}>{page.description}</p>
          <button onClick={() => document.getElementById('t2-contact')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'14px 32px',background:'#1a1916',color:'#faf9f6',border:'none',borderRadius:3,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
            {page.ctaText || 'Get in touch'}
          </button>
        </div>
        <div style={{ display:'flex',flexDirection:'column' }}>
          {links.map((link: any, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 0',borderBottom:'1px solid #e8e4dc',fontSize:15,color:'#7a7060',cursor:'pointer' }}>
              {link.label}
              <span style={{ fontSize:18,color:ac }}>→</span>
            </a>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="t2-contact" style={{ background:'#fff',borderTop:'1px solid #e8e4dc',borderBottom:'1px solid #e8e4dc' }}>
        <div style={{ maxWidth:640,margin:'0 auto',padding:'80px 56px' }}>
          <div style={{ fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'#b0a898',marginBottom:14,textAlign:'center' }}>Get in touch</div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:'clamp(28px,3vw,42px)',letterSpacing:-.3,marginBottom:10,textAlign:'center' }}>{page.contactHeadline || "We'd love to hear from you."}</h2>
          <p style={{ fontSize:15,color:'#7a7060',textAlign:'center',marginBottom:36,lineHeight:1.7 }}>{page.contactSub || 'Send us a message and we will respond within 24 hours.'}</p>
          {!contactSent ? (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                <input style={inp} type="text" placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)} />
                <input style={inp} type="email" placeholder="your@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
              <textarea style={{ ...inp,resize:'none',height:110 }} placeholder="Your message..." value={contactMsg} onChange={e => setContactMsg(e.target.value)} />
              <button onClick={sendContact} disabled={loading || !contactName || !contactEmail || !contactMsg}
                style={{ padding:15,background:'#1a1916',color:'#faf9f6',border:'none',borderRadius:3,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",opacity:(!contactName||!contactEmail||!contactMsg)?0.5:1 }}>
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </div>
          ) : (
            <div style={{ padding:'20px',background:`${ac}0d`,border:`1px solid ${ac}33`,borderRadius:4,fontSize:13,color:ac,textAlign:'center' }}>
              ✓ Message sent — we'll be in touch soon
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ maxWidth:1280,margin:'0 auto',padding:'36px 56px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:18 }}>{page.title}</div>
        <div style={{ display:'flex',gap:28 }}>
          {links.slice(0,4).map((l: any, i: number) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ fontSize:13,color:'#b0a898' }}>{l.label}</a>
          ))}
        </div>
        <div style={{ fontSize:12,color:'#b0a898' }}>powered by easonet</div>
      </footer>
    </>
  )
}
