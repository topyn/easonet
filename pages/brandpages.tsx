import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { authFetch, clearTokens } from '../lib/auth-client'

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '') }

const BG='#080808',BG2='#101010',BG3='#161616',BORDER='rgba(255,255,255,0.07)',TEXT='#f0f0ee',MUTED='#666',ACCENT='#7B6EF6'
const ACCENT_COLORS=['#7B6EF6','#3ECF8E','#F5A623','#60A5FA','#F87171','#A78BFA','#34D399','#FB923C','#C8953A','#E879F9']

const EMPTY_FORM = {
  slug:'',title:'',tagline:'',description:'',logoUrl:'',heroImage:'',
  accentColor:'#7B6EF6',bgStyle:'dark',fontStyle:'modern',
  template:'3',
  headlineLine1:'',headlineLine2:'',badgeText:'',ctaText:'',featuresHeadline:'',
  aboutHeadline:'',contactHeadline:'',contactSub:'',customDomain:'',
  storeId:'',waitlistId:'',identityId:'',
  features:[{label:'',title:'',desc:''},{label:'',title:'',desc:''},{label:'',title:'',desc:''}],
  stats:[{num:'',label:''},{num:'',label:''},{num:'',label:''},{num:'',label:''}],
  links:[] as {label:string;url:string}[],
  sections:[] as {title:string;content:string}[],
}

const TEMPLATE_STYLES = [
  { id:'1', name:'Dark Pro', desc:'Dark grid, monospace labels, tech aesthetic', bg:'#080808', accent:'#7B6EF6', font:"'Syne',sans-serif", headingColor:'#f0f0ee', tagColor:'#7B6EF6' },
  { id:'2', name:'Clean Light', desc:'Elegant serif, cream tones, premium feel', bg:'#faf9f6', accent:'#C8953A', font:"'Playfair Display',Georgia,serif", headingColor:'#1a1916', tagColor:'#C8953A' },
  { id:'3', name:'Bold Startup', desc:'High contrast, heavy type, consumer brand', bg:'#F5A623', accent:'#F5A623', font:"'Space Grotesk',sans-serif", headingColor:'#111008', tagColor:'#111008' },
]

export default function BrandPagesManager() {
  const router = useRouter()
  const [pages, setPages] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [step, setStep] = useState<'list'|'pick'|'form'>('list')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [waitlists, setWaitlists] = useState<any[]>([])
  const [newLink, setNewLink] = useState({label:'',url:''})
  const [form, setForm] = useState({...EMPTY_FORM})
  const [isEditing, setIsEditing] = useState(false)
  const [activeSection, setActiveSection] = useState('basics')

  useEffect(() => {
    try { if (!localStorage.getItem('easonet_token')) { router.replace('/login'); return } } catch { router.replace('/login'); return }
    load()
    authFetch('/api/stores').then(r=>r.json()).then(d=>setStores(Array.isArray(d)?d:[]))
    authFetch('/api/waitlists').then(r=>r.json()).then(d=>setWaitlists(Array.isArray(d)?d:[]))
  }, [])

  async function load() {
    const data = await authFetch('/api/brandpages').then(r=>r.json())
    setPages(Array.isArray(data)?data:[])
    setLoading(false)
  }

  async function openPage(p: any) {
    const data = await authFetch(`/api/brandpages/${p.id}`).then(r=>r.json())
    setSelected(data)
    setIsEditing(true)
    const f = {
      ...EMPTY_FORM, ...data,
      storeId: data.storeId||'', waitlistId: data.waitlistId||'',
      identityId: data.identityId||'', customDomain: data.customDomain||'',
      heroImage: data.heroImage||'', logoUrl: data.logoUrl||'',
      headlineLine1: data.headlineLine1||'', headlineLine2: data.headlineLine2||'',
      badgeText: data.badgeText||'', ctaText: data.ctaText||'',
      featuresHeadline: data.featuresHeadline||'', aboutHeadline: data.aboutHeadline||'',
      contactHeadline: data.contactHeadline||'', contactSub: data.contactSub||'',
      template: data.template||'3',
      features: data.features?.length ? data.features : EMPTY_FORM.features,
      stats: data.stats?.length ? data.stats : EMPTY_FORM.stats,
      links: data.links||[], sections: data.sections||[],
    }
    setForm(f)
    setStep('form')
    setActiveSection('basics')
  }

  async function createPage() {
    if (!form.title || !form.slug) return
    setSaving(true)
    const res = await authFetch('/api/brandpages', { method:'POST', body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error||'Failed'); return }
    setSelected(data)
    setIsEditing(true)
    load()
  }

  async function savePage() {
    if (!selected) return
    setSaving(true)
    await authFetch(`/api/brandpages/${selected.id}`, { method:'PUT', body: JSON.stringify(form) })
    setSaving(false)
    load()
  }

  async function deletePage() {
    if (!selected||!confirm('Delete this page?')) return
    await authFetch(`/api/brandpages/${selected.id}`, { method:'DELETE' })
    setSelected(null); setStep('list'); load()
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(()=>setCopied(''),2000)
  }

  function updateFeature(i: number, field: string, val: string) {
    setForm(f => ({ ...f, features: f.features.map((feat, j) => j===i ? {...feat, [field]:val} : feat) }))
  }

  function updateStat(i: number, field: string, val: string) {
    setForm(f => ({ ...f, stats: f.stats.map((s, j) => j===i ? {...s, [field]:val} : s) }))
  }

  const inp: React.CSSProperties = { width:'100%',padding:'10px 14px',background:BG,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:13,color:TEXT,outline:'none',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box' as const }
  const lbl: React.CSSProperties = { fontFamily:"'DM Mono',monospace",fontSize:10,color:'#444',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em' }
  const btn: React.CSSProperties = { padding:'9px 20px',background:ACCENT,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }
  const ghost: React.CSSProperties = { padding:'9px 16px',background:'transparent',border:`1px solid ${BORDER}`,borderRadius:8,fontSize:13,cursor:'pointer',color:MUTED,fontFamily:"'DM Sans',sans-serif" }
  const selStyle: React.CSSProperties = { ...inp,cursor:'pointer' }
  const row: React.CSSProperties = { display:'flex',flexDirection:'column',gap:6 }

  const sections = [
    { id:'basics', label:'Basics' },
    { id:'hero', label:'Hero' },
    { id:'features', label:'Features' },
    { id:'stats', label:'Stats' },
    { id:'links', label:'Links' },
    { id:'style', label:'Style' },
    { id:'connect', label:'Connect' },
    { id:'domain', label:'Domain' },
  ]

  return (
    <>
      <Head>
        <title>Brand Pages — Easonet</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=Playfair+Display:wght@700;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:${BG};color:${TEXT}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:4px}select option{background:${BG2}}`}</style>

      {/* NAV */}
      <nav style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',gap:24,padding:'0 32px',height:56,background:'rgba(8,8,8,.9)',backdropFilter:'blur(20px)',borderBottom:`1px solid ${BORDER}` }}>
        <a href="/app" style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,letterSpacing:-.5,color:TEXT }}>easonet</a>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#333' }}>/</div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:ACCENT }}>brand pages</div>
        <div style={{ flex:1 }}/>
        {step!=='list' && (
          <button onClick={()=>{setStep('list');setSelected(null);setIsEditing(false)}} style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333',background:'none',border:'none',cursor:'pointer' }}>← all pages</button>
        )}
        <a href="/app" style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333' }}>← inbox</a>
      </nav>

      <div style={{ paddingTop:56,minHeight:'100vh',display:'flex',fontFamily:"'DM Sans',sans-serif" }}>

        {/* SIDEBAR */}
        <div style={{ width:260,borderRight:`1px solid ${BORDER}`,background:BG2,display:'flex',flexDirection:'column',position:'fixed',top:56,bottom:0,overflowY:'auto' }}>
          <div style={{ padding:'16px 16px 12px',borderBottom:`1px solid ${BORDER}` }}>
            <button onClick={()=>{setStep('pick');setSelected(null);setIsEditing(false);setForm({...EMPTY_FORM})}} style={{ ...btn,width:'100%',fontSize:12 }}>+ New brand page</button>
          </div>
          <div style={{ flex:1,padding:'8px 0' }}>
            {loading
              ? <div style={{ padding:'20px 16px',fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333' }}>// loading…</div>
              : pages.length===0
              ? <div style={{ padding:'20px 16px',fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333' }}>// no pages yet</div>
              : pages.map(p=>(
                <div key={p.id} onClick={()=>openPage(p)}
                  style={{ padding:'12px 16px',cursor:'pointer',borderBottom:`1px solid ${BORDER}`,background:selected?.id===p.id?'rgba(255,255,255,.03)':'transparent' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:p.accentColor||ACCENT,flexShrink:0 }}/>
                    <div style={{ fontSize:13,fontWeight:500,color:TEXT }}>{p.title}</div>
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#333' }}>/{p.slug}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* MAIN */}
        <div style={{ marginLeft:260,flex:1,padding:'32px 40px',maxWidth:800 }}>

          {/* ── STEP 1: PICK TEMPLATE ── */}
          {step==='pick' && (
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,letterSpacing:-.5,marginBottom:8 }}>Choose a style</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333',marginBottom:32 }}>// you can change this later at any time</div>
              <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                {TEMPLATE_STYLES.map(t=>(
                  <div key={t.id} onClick={()=>setForm(f=>({...f,template:t.id,accentColor:t.accent}))}
                    style={{ border:`2px solid ${form.template===t.id?ACCENT:'rgba(255,255,255,.08)'}`,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'border-color .2s',background:BG2 }}>
                    {/* Mini preview */}
                    <div style={{ background:t.bg,padding:'24px 28px',position:'relative' }}>
                      {t.id==='1' && <>
                        <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)',backgroundSize:'24px 24px' }}/>
                        <div style={{ position:'relative' }}>
                          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:t.accent,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6 }}>// bold startup</div>
                          <div style={{ fontFamily:t.font,fontWeight:800,fontSize:22,letterSpacing:-1,color:t.headingColor,lineHeight:1.1,marginBottom:6 }}>Show it off.<br/><span style={{ color:t.accent }}>Keep it safe.</span></div>
                          <div style={{ fontSize:11,color:'rgba(240,240,238,.4)',marginBottom:14 }}>Premium perspex coasters for collectors.</div>
                          <div style={{ display:'inline-block',padding:'6px 14px',background:t.accent,color:'#fff',borderRadius:6,fontSize:11,fontWeight:600 }}>Order now →</div>
                        </div>
                      </>}
                      {t.id==='2' && <>
                        <div style={{ fontFamily:"Georgia,serif",fontSize:10,color:t.tagColor,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8 }}>Premium Coaster Protection</div>
                        <div style={{ fontFamily:t.font,fontWeight:900,fontSize:22,letterSpacing:-.5,color:t.headingColor,lineHeight:1.1,marginBottom:6 }}>Your collection<br/>deserves <em style={{ color:t.accent }}>better.</em></div>
                        <div style={{ fontSize:11,color:'#7a7060',marginBottom:14 }}>Perspex coasters with magnetic edges.</div>
                        <div style={{ display:'inline-block',padding:'6px 16px',background:t.headingColor,color:t.bg,borderRadius:3,fontSize:11,fontWeight:500 }}>Shop now</div>
                      </>}
                      {t.id==='3' && <>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'rgba(17,16,8,.5)',marginBottom:6 }}>Collectors Edition</div>
                        <div style={{ fontFamily:t.font,fontWeight:700,fontSize:26,letterSpacing:-1.5,color:t.headingColor,lineHeight:.95,marginBottom:10 }}>Show it off.<br/>Keep it safe.</div>
                        <div style={{ display:'flex',gap:8 }}>
                          <div style={{ padding:'6px 14px',background:'#111008',color:t.accent,borderRadius:6,fontSize:11,fontWeight:700 }}>Order now →</div>
                          <div style={{ padding:'6px 14px',border:'2px solid #111008',borderRadius:6,fontSize:11,fontWeight:700,color:'#111008' }}>See more</div>
                        </div>
                      </>}
                    </div>
                    <div style={{ padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:14,fontWeight:500,color:TEXT,marginBottom:2 }}>{t.name}</div>
                        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#444' }}>{t.desc}</div>
                      </div>
                      {form.template===t.id && (
                        <div style={{ width:20,height:20,borderRadius:'50%',background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',flexShrink:0 }}>✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24,display:'flex',gap:10 }}>
                <button onClick={()=>setStep('form')} style={btn}>Continue with {TEMPLATE_STYLES.find(t=>t.id===form.template)?.name} →</button>
                <button onClick={()=>setStep('list')} style={ghost}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: FORM ── */}
          {step==='form' && (
            <div>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,letterSpacing:-.5,marginBottom:4 }}>
                    {isEditing ? form.title || 'Edit page' : 'New brand page'}
                  </div>
                  {isEditing && selected && (
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333' }}>easonet.com/p/{selected.slug}</div>
                  )}
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  {isEditing && selected && (
                    <>
                      <a href={`/p/${selected.slug}`} target="_blank" rel="noreferrer">
                        <button style={ghost}>Preview ↗</button>
                      </a>
                      <button onClick={savePage} disabled={saving} style={btn}>{saving?'Saving…':'Save changes'}</button>
                      <button onClick={deletePage} style={{ ...ghost,color:'#ff6b6b',borderColor:'rgba(255,107,107,.2)' }}>Delete</button>
                    </>
                  )}
                  {!isEditing && (
                    <button onClick={createPage} disabled={saving||!form.title||!form.slug} style={{ ...btn,opacity:saving?0.5:1 }}>
                      {saving?'Creating…':'Create page →'}
                    </button>
                  )}
                </div>
              </div>

              {/* Share bar — only when editing */}
              {isEditing && selected && (
                <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',gap:10,alignItems:'center' }}>
                  <div style={{ flex:1,fontFamily:"'DM Mono',monospace",fontSize:12,color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    https://easonet.com/p/{selected.slug}
                  </div>
                  <button onClick={()=>copy(`https://easonet.com/p/${selected.slug}`,'url')} style={{ ...ghost,fontSize:11,padding:'6px 12px',color:copied==='url'?'#3ECF8E':MUTED }}>
                    {copied==='url'?'✓ Copied':'Copy'}
                  </button>
                </div>
              )}

              {/* Section tabs */}
              <div style={{ display:'flex',gap:2,flexWrap:'wrap',marginBottom:24,background:'rgba(255,255,255,.03)',borderRadius:10,padding:4 }}>
                {sections.map(s=>(
                  <button key={s.id} onClick={()=>setActiveSection(s.id)}
                    style={{ padding:'6px 14px',borderRadius:7,border:'none',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontSize:11,background:activeSection===s.id?ACCENT:'transparent',color:activeSection===s.id?'#fff':MUTED,whiteSpace:'nowrap' as const }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ── BASICS ── */}
              {activeSection==='basics' && (
                <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                  <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
                    <div style={row}>
                      <label style={lbl}>Brand name *</label>
                      <input style={inp} placeholder="e.g. EzCoaster" value={form.title}
                        onChange={e=>setForm(f=>({...f,title:e.target.value,slug:isEditing?f.slug:slugify(e.target.value)}))} />
                    </div>
                    {!isEditing && (
                      <div style={row}>
                        <label style={lbl}>URL slug *</label>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:'#333',whiteSpace:'nowrap' }}>easonet.com/p/</span>
                          <input style={{ ...inp,flex:1 }} value={form.slug} onChange={e=>setForm(f=>({...f,slug:slugify(e.target.value)}))} />
                        </div>
                      </div>
                    )}
                    <div style={row}>
                      <label style={lbl}>Short tagline</label>
                      <input style={inp} placeholder="e.g. Show it off. Keep it safe." value={form.tagline} onChange={e=>setForm(f=>({...f,tagline:e.target.value}))} />
                    </div>
                    <div style={row}>
                      <label style={lbl}>About / description</label>
                      <textarea style={{ ...inp,resize:'none',height:100 }} placeholder="Tell visitors what you do and who you are..."
                        value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
                    <div style={row}>
                      <label style={lbl}>Logo URL</label>
                      <input style={inp} placeholder="https://... (upload to imgur.com for a free URL)" value={form.logoUrl} onChange={e=>setForm(f=>({...f,logoUrl:e.target.value}))} />
                      {form.logoUrl && <img src={form.logoUrl} style={{ width:48,height:48,borderRadius:8,objectFit:'cover',border:`1px solid ${BORDER}` }} alt="logo preview" />}
                    </div>
                    <div style={row}>
                      <label style={lbl}>About headline</label>
                      <input style={inp} placeholder="e.g. Built by a collector, for collectors." value={form.aboutHeadline} onChange={e=>setForm(f=>({...f,aboutHeadline:e.target.value}))} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── HERO ── */}
              {activeSection==='hero' && (
                <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4 }}>// hero section content</div>
                  <div style={row}>
                    <label style={lbl}>Badge / eyebrow text</label>
                    <input style={inp} placeholder="e.g. New — Collectors Edition 2026" value={form.badgeText} onChange={e=>setForm(f=>({...f,badgeText:e.target.value}))} />
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                    <div style={row}>
                      <label style={lbl}>Headline line 1</label>
                      <input style={inp} placeholder="e.g. Show it off." value={form.headlineLine1} onChange={e=>setForm(f=>({...f,headlineLine1:e.target.value}))} />
                    </div>
                    <div style={row}>
                      <label style={lbl}>Headline line 2 (accented)</label>
                      <input style={inp} placeholder="e.g. Keep it safe." value={form.headlineLine2} onChange={e=>setForm(f=>({...f,headlineLine2:e.target.value}))} />
                    </div>
                  </div>
                  <div style={row}>
                    <label style={lbl}>CTA button text</label>
                    <input style={inp} placeholder="e.g. Order now" value={form.ctaText} onChange={e=>setForm(f=>({...f,ctaText:e.target.value}))} />
                  </div>
                  <div style={row}>
                    <label style={lbl}>Product / hero image URL</label>
                    <input style={inp} placeholder="Paste an image URL — upload to imgur.com for free" value={form.heroImage} onChange={e=>setForm(f=>({...f,heroImage:e.target.value}))} />
                    {form.heroImage && <img src={form.heroImage} style={{ width:'100%',maxHeight:200,borderRadius:8,objectFit:'cover',border:`1px solid ${BORDER}` }} alt="hero preview" />}
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#333',lineHeight:1.6 }}>
                      // To get an image URL: upload to <a href="https://imgur.com" target="_blank" style={{ color:ACCENT }}>imgur.com</a> → right-click → Copy image address. Or use Cloudinary, Cloudflare Images, or any CDN.
                    </div>
                  </div>
                </div>
              )}

              {/* ── FEATURES ── */}
              {activeSection==='features' && (
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px' }}>
                    <label style={lbl}>Features section headline</label>
                    <input style={inp} placeholder="e.g. What sets us apart." value={form.featuresHeadline} onChange={e=>setForm(f=>({...f,featuresHeadline:e.target.value}))} />
                  </div>
                  {form.features.map((feat,i)=>(
                    <div key={i} style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px' }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:14 }}>// feature {i+1}</div>
                      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:12 }}>
                          <div style={row}>
                            <label style={lbl}>Label (short)</label>
                            <input style={inp} placeholder="e.g. protect" value={feat.label} onChange={e=>updateFeature(i,'label',e.target.value)} />
                          </div>
                          <div style={row}>
                            <label style={lbl}>Title</label>
                            <input style={inp} placeholder="e.g. Zero scratches, ever." value={feat.title} onChange={e=>updateFeature(i,'title',e.target.value)} />
                          </div>
                        </div>
                        <div style={row}>
                          <label style={lbl}>Description</label>
                          <textarea style={{ ...inp,resize:'none',height:72 }} placeholder="One or two sentences explaining this feature..." value={feat.desc} onChange={e=>updateFeature(i,'desc',e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── STATS ── */}
              {activeSection==='stats' && (
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333',marginBottom:4 }}>// big numbers that make an impact — e.g. "4 / Magnets", "100% / Perspex", "0 / Scratches"</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                    {form.stats.map((s,i)=>(
                      <div key={i} style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'16px 20px',display:'flex',gap:12 }}>
                        <div style={{ flex:'0 0 80px' }}>
                          <label style={lbl}>Number</label>
                          <input style={inp} placeholder="e.g. 4" value={s.num} onChange={e=>updateStat(i,'num',e.target.value)} />
                        </div>
                        <div style={{ flex:1 }}>
                          <label style={lbl}>Label</label>
                          <input style={inp} placeholder="e.g. Magnets" value={s.label} onChange={e=>updateStat(i,'label',e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LINKS ── */}
              {activeSection==='links' && (
                <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4 }}>// links shown on the page</div>
                  {form.links.map((link,i)=>(
                    <div key={i} style={{ display:'flex',gap:8,alignItems:'center' }}>
                      <div style={{ flex:1,fontFamily:"'DM Mono',monospace",fontSize:12,color:'#555',background:BG3,padding:'8px 12px',borderRadius:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        {link.label} → {link.url}
                      </div>
                      <button onClick={()=>setForm(f=>({...f,links:f.links.filter((_,j)=>j!==i)}))}
                        style={{ padding:'6px 10px',border:'1px solid rgba(255,107,107,.2)',borderRadius:6,background:'transparent',color:'#ff6b6b',cursor:'pointer',fontSize:12 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr auto',gap:8 }}>
                    <input style={inp} placeholder="Label" value={newLink.label} onChange={e=>setNewLink(l=>({...l,label:e.target.value}))} />
                    <input style={inp} placeholder="https://..." value={newLink.url} onChange={e=>setNewLink(l=>({...l,url:e.target.value}))} />
                    <button onClick={()=>{if(newLink.label&&newLink.url){setForm(f=>({...f,links:[...f.links,newLink]}));setNewLink({label:'',url:''})}}} style={{ ...btn,padding:'9px 14px',whiteSpace:'nowrap' as const }}>+ Add</button>
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:'#333',lineHeight:1.8 }}>
                    // tip: Instagram / Twitter / LinkedIn / GitHub / YouTube / TikTok labels get auto-icons
                  </div>
                  <div style={{ marginTop:8 }}>
                    <label style={lbl}>Contact section headline</label>
                    <input style={inp} placeholder="e.g. Let's talk." value={form.contactHeadline} onChange={e=>setForm(f=>({...f,contactHeadline:e.target.value}))} />
                  </div>
                  <div style={row}>
                    <label style={lbl}>Contact section subtext</label>
                    <input style={inp} placeholder="e.g. Reach out and we will get back to you fast." value={form.contactSub} onChange={e=>setForm(f=>({...f,contactSub:e.target.value}))} />
                  </div>
                </div>
              )}

              {/* ── STYLE ── */}
              {activeSection==='style' && (
                <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                  <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px' }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:16 }}>// switch template</div>
                    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                      {TEMPLATE_STYLES.map(t=>(
                        <div key={t.id} onClick={()=>setForm(f=>({...f,template:t.id}))}
                          style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 16px',border:`1px solid ${form.template===t.id?ACCENT:BORDER}`,borderRadius:10,cursor:'pointer',background:form.template===t.id?`${ACCENT}10`:'transparent' }}>
                          <div style={{ width:36,height:36,borderRadius:6,background:t.bg,border:`1px solid ${BORDER}`,flexShrink:0,overflow:'hidden' }}>
                            <div style={{ height:'40%',background:t.id==='3'?t.accent:t.id==='1'?'#141414':t.bg }}/>
                          </div>
                          <div>
                            <div style={{ fontSize:13,fontWeight:500,color:TEXT }}>{t.name}</div>
                            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#444' }}>{t.desc}</div>
                          </div>
                          {form.template===t.id && <div style={{ marginLeft:'auto',width:18,height:18,borderRadius:'50%',background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff' }}>✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px' }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:16 }}>// accent colour</div>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                      {ACCENT_COLORS.map(c=>(
                        <div key={c} onClick={()=>setForm(f=>({...f,accentColor:c}))}
                          style={{ width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:form.accentColor===c?`2px solid ${TEXT}`:'2px solid transparent',boxSizing:'border-box' }}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONNECT ── */}
              {activeSection==='connect' && (
                <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4 }}>// embed your easonet tools</div>
                  <div style={row}>
                    <label style={lbl}>Store (shows product grid with checkout)</label>
                    <select style={selStyle} value={form.storeId} onChange={e=>setForm(f=>({...f,storeId:e.target.value}))}>
                      <option value="">No store</option>
                      {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={row}>
                    <label style={lbl}>Waitlist (shows email signup)</label>
                    <select style={selStyle} value={form.waitlistId} onChange={e=>setForm(f=>({...f,waitlistId:e.target.value}))}>
                      <option value="">No waitlist</option>
                      {waitlists.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* ── DOMAIN ── */}
              {activeSection==='domain' && (
                <div style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:12,padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:ACCENT,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4 }}>// point your own domain here</div>
                  <div style={row}>
                    <label style={lbl}>Custom domain</label>
                    <input style={inp} placeholder="e.g. ezcoaster.com" value={form.customDomain} onChange={e=>setForm(f=>({...f,customDomain:e.target.value}))} />
                  </div>
                  {form.customDomain && (
                    <div style={{ background:BG3,borderRadius:8,padding:'16px 18px' }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#444',marginBottom:12,textTransform:'uppercase',letterSpacing:'.08em' }}>Add this DNS A record</div>
                      {[{k:'Type',v:'A'},{k:'Name',v:'@'},{k:'Value',v:'76.76.21.21'},{k:'TTL',v:'3600'}].map(r=>(
                        <div key={r.k} style={{ display:'flex',gap:16,fontFamily:"'DM Mono',monospace",fontSize:12,marginBottom:8 }}>
                          <span style={{ color:'#444',minWidth:48 }}>{r.k}</span>
                          <span style={{ color:TEXT }}>{r.v}</span>
                        </div>
                      ))}
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:'#333',marginTop:12 }}>// after saving, we'll register your domain with our servers automatically</div>
                    </div>
                  )}
                </div>
              )}

              {/* Save button at bottom */}
              {isEditing && (
                <div style={{ marginTop:24,paddingTop:20,borderTop:`1px solid ${BORDER}`,display:'flex',gap:10 }}>
                  <button onClick={savePage} disabled={saving} style={btn}>{saving?'Saving…':'Save all changes →'}</button>
                  {selected && <a href={`/p/${selected.slug}`} target="_blank" rel="noreferrer"><button style={ghost}>Preview ↗</button></a>}
                </div>
              )}
              {!isEditing && (
                <div style={{ marginTop:24,paddingTop:20,borderTop:`1px solid ${BORDER}`,display:'flex',gap:10 }}>
                  <button onClick={createPage} disabled={saving||!form.title||!form.slug} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?'Creating…':'Create page →'}</button>
                  <button onClick={()=>setStep('pick')} style={ghost}>← Change template</button>
                </div>
              )}
            </div>
          )}

          {/* ── LIST / EMPTY STATE ── */}
          {step==='list' && !loading && pages.length===0 && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'calc(100vh - 200px)',gap:16 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,letterSpacing:-1,textAlign:'center' }}>Your brand, one page</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:'#333',textAlign:'center',maxWidth:360,lineHeight:1.8 }}>Pick a style, fill in your details, and go live in minutes. Point your own domain at it for free.</div>
              <button onClick={()=>setStep('pick')} style={{ ...btn,marginTop:8 }}>Create your first page →</button>
            </div>
          )}
          {step==='list' && !loading && pages.length>0 && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'calc(100vh - 200px)',gap:12 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:'#333' }}>// select a page from the sidebar to edit</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
